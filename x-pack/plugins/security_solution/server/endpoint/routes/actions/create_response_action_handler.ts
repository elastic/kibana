/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import type { Logger } from '@kbn/core/server';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';
import type { CasesByAlertId } from '@kbn/cases-plugin/common/api';
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { TypeOf } from '@kbn/config-schema';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { ResponseActionBodySchema } from '../../../../common/endpoint/schema/actions';
import type { EndpointAppContext } from '../../types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  EndpointAction,
  EndpointActionData,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionsExecuteParameters,
} from '../../../../common/endpoint/types';
import {
  ENDPOINT_ACTION_RESPONSES_DS,
  ENDPOINT_ACTIONS_INDEX,
  failedFleetActionErrorCode,
} from '../../../../common/endpoint/constants';
import { APP_ID } from '../../../../common/constants';
import { getActionDetailsById, getMetadataForEndpoints } from '../../services';

const returnActionIdCommands: ResponseActionsApiCommandNames[] = ['isolate', 'unisolate'];

export interface CreateResponseActionHandlerOptions {
  casesClient?: CasesClient;
  command: ResponseActionsApiCommandNames;
  doesLogsEndpointActionsDsExist?: boolean;
  metadata: {
    currentUser?: AuthenticatedUser | null;
  };
}

export const createResponseActionHandler = async (
  endpointContext: EndpointAppContext,
  params: TypeOf<typeof ResponseActionBodySchema>,
  options: CreateResponseActionHandlerOptions
) => {
  const {
    metadata: { currentUser },
    casesClient,
    command,
    doesLogsEndpointActionsDsExist = true, // TODO double check this one,
  } = options;

  const [coreStartServices] = await endpointContext.getStartServices();
  const esClient = coreStartServices.elasticsearch.client.asInternalUser;
  const logger = endpointContext.logFactory.get('host-isolation');

  // convert any alert IDs into cases
  let caseIDs: string[] = params.case_ids?.slice() || [];
  if (casesClient && params.alert_ids && params.alert_ids.length > 0) {
    const newIDs: string[][] = await Promise.all(
      params.alert_ids.map(async (a: string) => {
        const cases: CasesByAlertId = await casesClient.cases.getCasesByAlertID({
          alertID: a,
          options: { owner: APP_ID },
        });
        return cases.map((caseInfo): string => {
          return caseInfo.id;
        });
      })
    );
    caseIDs = caseIDs.concat(...newIDs);
  }
  caseIDs = [...new Set(caseIDs)];

  // create an Action ID and dispatch it to ES & Fleet Server
  const actionID = uuidv4();

  let fleetActionIndexResult;
  let logsEndpointActionsResult;
  const endpointIds: string[] = [...new Set(params.endpoint_ids)]; // dedupe
  const endpointData = await getMetadataForEndpoints(endpointIds, esClient);

  const getActionParameters = () => {
    // set timeout to 4h (if not specified or when timeout is specified as 0) when command is `execute`
    if (command === 'execute') {
      const actionRequestParams = params.parameters as ResponseActionsExecuteParameters;
      if (typeof actionRequestParams?.timeout === 'undefined') {
        return { ...actionRequestParams, timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT };
      }
      return actionRequestParams;
    }

    // for all other commands return the parameters as is
    return params.parameters ?? undefined;
  };

  const agents = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);
  const doc = {
    '@timestamp': moment().toISOString(),
    agent: {
      id: agents,
    },
    alert_ids: params.alert_ids,
    EndpointActions: {
      action_id: actionID,
      expiration: moment().add(2, 'weeks').toISOString(),
      type: 'INPUT_ACTION',
      input_type: 'endpoint',
      data: {
        command,
        comment: params.comment ?? undefined,
        parameters: getActionParameters(),
      } as EndpointActionData,
    } as Omit<EndpointAction, 'agents' | 'user_id' | '@timestamp'>,
    user: {
      id: currentUser ? currentUser.username : 'unknown',
    },
  };

  if (doesLogsEndpointActionsDsExist) {
    try {
      logsEndpointActionsResult = await esClient.index<LogsEndpointAction>(
        {
          index: ENDPOINT_ACTIONS_INDEX,
          body: {
            ...doc,
          },
          refresh: 'wait_for',
        },
        { meta: true }
      );
      if (logsEndpointActionsResult.statusCode !== 201) {
        throw new Error(logsEndpointActionsResult.body.result);
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  // add signature to doc
  const fleetActionDoc = {
    ...doc.EndpointActions,
    '@timestamp': doc['@timestamp'],
    agents,
    timeout: 300, // 5 minutes
    user_id: doc.user.id,
  };
  const fleetActionDocSignature = await endpointContext.service
    .getMessageSigningService()
    .sign(fleetActionDoc);
  const signedFleetActionDoc = {
    ...fleetActionDoc,
    signed: {
      data: fleetActionDocSignature.data.toString('base64'),
      signature: fleetActionDocSignature.signature,
    },
  };

  try {
    fleetActionIndexResult = await esClient.index<EndpointAction>(
      {
        index: AGENT_ACTIONS_INDEX,
        body: signedFleetActionDoc,
        refresh: 'wait_for',
      },
      { meta: true }
    );

    if (fleetActionIndexResult.statusCode !== 201) {
      throw new Error(fleetActionIndexResult.body.result);
    }
  } catch (e) {
    // create entry in .logs-endpoint.action.responses-default data stream
    // when writing to .fleet-actions fails
    if (doesLogsEndpointActionsDsExist) {
      await createFailedActionResponseEntry({
        esClient,
        doc: {
          '@timestamp': moment().toISOString(),
          agent: doc.agent,
          EndpointActions: {
            action_id: doc.EndpointActions.action_id,
            completed_at: moment().toISOString(),
            started_at: moment().toISOString(),
            data: doc.EndpointActions.data,
          },
        },
        logger,
      });
    }
    throw new Error(e);
  }

  // Update all cases with a comment
  if (caseIDs.length > 0) {
    const targets = endpointData.map((endpt: HostMetadata) => ({
      hostname: endpt.host.hostname,
      endpointId: endpt.agent.id,
    }));

    await Promise.all(
      caseIDs.map((caseId) =>
        casesClient?.attachments.add({
          caseId,
          comment: {
            type: CommentType.actions,
            comment: params.comment || '',
            actions: {
              targets,
              type: command,
            },
            owner: APP_ID,
          },
        })
      )
    );
  }

  const body = returnActionIdCommands.includes(command) ? { action: actionID } : {};

  const data = await getActionDetailsById(
    esClient,
    endpointContext.service.getEndpointMetadataService(),
    actionID
  );

  return {
    body,
    data,
  };
};

const createFailedActionResponseEntry = async ({
  esClient,
  doc,
  logger,
}: {
  esClient: ElasticsearchClient;
  doc: LogsEndpointActionResponse;
  logger: Logger;
}): Promise<void> => {
  // 8.0+ requires internal user to write to system indices
  try {
    await esClient.index<LogsEndpointActionResponse>({
      index: `${ENDPOINT_ACTION_RESPONSES_DS}-default`,
      body: {
        ...doc,
        error: {
          code: failedFleetActionErrorCode,
          message: 'Failed to deliver action request to fleet',
        },
      },
    });
  } catch (e) {
    logger.error(e);
  }
};

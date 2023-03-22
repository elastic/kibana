/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { CasesByAlertId } from '@kbn/cases-plugin/common/api';
import { CommentType } from '@kbn/cases-plugin/common';
import type { AuthenticationServiceStart } from '@kbn/security-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import type { TransportResult } from '@elastic/elasticsearch';
import type { IndexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ResponseActionBodySchema } from '../../../../../common/endpoint/schema/actions';
import { APP_ID } from '../../../../../common/constants';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../../common/endpoint/service/response_actions/constants';
import {
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_DS,
  failedFleetActionErrorCode,
} from '../../../../../common/endpoint/constants';
import { doLogsEndpointActionDsExists } from '../../../utils';
import type {
  ActionDetails,
  EndpointAction,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionsExecuteParameters,
} from '../../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../../types';
import type { FeatureKeys } from '../../feature_usage';
import { getActionDetailsById } from '..';

const commandToFeatureKeyMap = new Map<ResponseActionsApiCommandNames, FeatureKeys>([
  ['isolate', 'HOST_ISOLATION'],
  ['unisolate', 'HOST_ISOLATION'],
  ['kill-process', 'KILL_PROCESS'],
  ['suspend-process', 'SUSPEND_PROCESS'],
  ['running-processes', 'RUNNING_PROCESSES'],
  ['get-file', 'GET_FILE'],
  ['execute', 'EXECUTE'],
]);

const returnActionIdCommands: ResponseActionsApiCommandNames[] = ['isolate', 'unisolate'];

export class ActionCreateService {
  constructor(private esClient: ElasticsearchClient, private endpointContext: EndpointAppContext) {}

  async createAction(
    payload: TypeOf<typeof ResponseActionBodySchema> & {
      command: ResponseActionsApiCommandNames;
      user?: ReturnType<AuthenticationServiceStart['getCurrentUser']>;
    },
    casesClient?: CasesClient
  ): Promise<ActionDetails> {
    const featureKey = commandToFeatureKeyMap.get(payload.command) as FeatureKeys;
    if (featureKey) {
      this.endpointContext.service.getFeatureUsageService().notifyUsage(featureKey);
    }

    const logger = this.endpointContext.logFactory.get('hostIsolation');

    // fetch the Agent IDs to send the commands to
    const endpointIDs = [...new Set(payload.endpoint_ids)]; // dedupe
    const endpointData = await this.endpointContext.service
      .getEndpointMetadataService()
      .getMetadataForEndpoints(this.esClient, endpointIDs);

    const agents = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);

    // create an Action ID and dispatch it to ES & Fleet Server
    const actionID = uuidv4();

    let fleetActionIndexResult: TransportResult<IndexResponse, unknown>;
    let logsEndpointActionsResult: TransportResult<IndexResponse, unknown>;

    const getActionParameters = () => {
      // set timeout to 4h (if not specified or when timeout is specified as 0) when command is `execute`
      if (payload.command === 'execute') {
        const actionRequestParams = payload.parameters as ResponseActionsExecuteParameters;
        if (typeof actionRequestParams?.timeout === 'undefined') {
          return { ...actionRequestParams, timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT };
        }
        return actionRequestParams;
      }

      // for all other commands return the parameters as is
      return payload.parameters ?? undefined;
    };

    const doc = {
      '@timestamp': moment().toISOString(),
      agent: {
        id: agents,
      },
      EndpointActions: {
        action_id: actionID,
        expiration: moment().add(2, 'weeks').toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        data: {
          command: payload.command,
          comment: payload.comment ?? undefined,
          parameters: getActionParameters() ?? undefined,
        },
      } as Omit<EndpointAction, 'agents' | 'user_id' | '@timestamp'>,
      user: {
        id: payload.user ? payload.user.username : 'unknown',
      },
    };

    // if .logs-endpoint.actions data stream exists
    // try to create action request record in .logs-endpoint.actions DS as the current user
    // (from >= v7.16, use this check to ensure the current user has privileges to write to the new index)
    // and allow only users with superuser privileges to write to fleet indices
    // const logger = endpointContext.logFactory.get('host-isolation');
    const doesLogsEndpointActionsDsExist = await doLogsEndpointActionDsExists({
      esClient: this.esClient,
      logger,
      dataStreamName: ENDPOINT_ACTIONS_DS,
    });

    // if the new endpoint indices/data streams exists
    // write the action request to the new endpoint index
    if (doesLogsEndpointActionsDsExist) {
      logsEndpointActionsResult = await this.esClient.index<LogsEndpointAction>(
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
    }

    // add signature to doc
    const fleetActionDoc = {
      ...doc.EndpointActions,
      '@timestamp': doc['@timestamp'],
      agents,
      timeout: 300, // 5 minutes
      user_id: doc.user.id,
    };
    const fleetActionDocSignature = await this.endpointContext.service
      .getMessageSigningService()
      .sign(fleetActionDoc);
    const signedFleetActionDoc = {
      ...fleetActionDoc,
      signed: {
        data: fleetActionDocSignature.data.toString('base64'),
        signature: fleetActionDocSignature.signature,
      },
    };

    // write actions to .fleet-actions index
    try {
      fleetActionIndexResult = await this.esClient.index<EndpointAction>(
        {
          index: AGENT_ACTIONS_INDEX,
          body: signedFleetActionDoc,
          refresh: 'wait_for',
        },
        {
          meta: true,
        }
      );

      if (fleetActionIndexResult.statusCode !== 201) {
        throw new Error(fleetActionIndexResult.body.result);
      }
    } catch (e) {
      // create entry in .logs-endpoint.action.responses-default data stream
      // when writing to .fleet-actions fails
      if (doesLogsEndpointActionsDsExist) {
        await createFailedActionResponseEntry({
          esClient: this.esClient,
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

      throw e;
    }

    if (casesClient) {
      // convert any alert IDs into cases
      let caseIDs: string[] = payload.case_ids?.slice() || [];
      if (payload.alert_ids && payload.alert_ids.length > 0) {
        const newIDs: string[][] = await Promise.all(
          payload.alert_ids.map(async (alertID: string) => {
            const cases: CasesByAlertId = await casesClient.cases.getCasesByAlertID({
              alertID,
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

      // Update all cases with a comment
      if (caseIDs.length > 0) {
        const targets = endpointData.map((endpt: HostMetadata) => ({
          hostname: endpt.host.hostname,
          endpointId: endpt.agent.id,
        }));

        await Promise.all(
          caseIDs.map((caseId) =>
            casesClient.attachments.add({
              caseId,
              comment: {
                type: CommentType.actions,
                comment: payload.comment || '',
                actions: {
                  targets,
                  type: payload.command,
                },
                owner: APP_ID,
              },
            })
          )
        );
      }
    }

    const actionId = returnActionIdCommands.includes(payload.command) ? { action: actionID } : {};

    const data = await getActionDetailsById(
      this.esClient,
      this.endpointContext.service.getEndpointMetadataService(),
      actionID
    );

    return {
      ...actionId,
      ...data,
    };
  }
}

const createFailedActionResponseEntry = async ({
  esClient,
  doc,
  logger,
}: {
  esClient: ElasticsearchClient;
  doc: LogsEndpointActionResponse;
  logger: Logger;
}): Promise<void> => {
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

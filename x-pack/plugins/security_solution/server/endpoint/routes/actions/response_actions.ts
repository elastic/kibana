/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

import type { RequestHandler, Logger } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { CasesByAlertId } from '@kbn/cases-plugin/common/api/cases/case';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';

import type { ResponseActionBodySchema } from '../../../../common/endpoint/schema/actions';
import {
  NoParametersRequestSchema,
  KillOrSuspendProcessRequestSchema,
  EndpointActionGetFileSchema,
} from '../../../../common/endpoint/schema/actions';
import { APP_ID } from '../../../../common/constants';
import {
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTION_RESPONSES_DS,
  failedFleetActionErrorCode,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  ENDPOINT_ACTIONS_INDEX,
  GET_FILE_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  EndpointAction,
  EndpointActionData,
  EndpointActionDataParameterTypes,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionParametersWithPidOrEntityId,
} from '../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { getMetadataForEndpoints, getActionDetailsById } from '../../services';
import { doLogsEndpointActionDsExists } from '../../utils';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { FeatureKeys } from '../../services/feature_usage/service';

export function registerResponseActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  /**
   * @deprecated use ISOLATE_HOST_ROUTE_V2 instead
   */
  router.post(
    {
      path: ISOLATE_HOST_ROUTE,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz({ all: ['canIsolateHost'] }, logger, redirectHandler(ISOLATE_HOST_ROUTE_V2))
  );

  /**
   * @deprecated use RELEASE_HOST_ROUTE instead
   */
  router.post(
    {
      path: UNISOLATE_HOST_ROUTE,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canUnIsolateHost'] },
      logger,
      redirectHandler(UNISOLATE_HOST_ROUTE_V2)
    )
  );

  router.post(
    {
      path: ISOLATE_HOST_ROUTE_V2,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canIsolateHost'] },
      logger,
      responseActionRequestHandler(endpointContext, 'isolate')
    )
  );

  router.post(
    {
      path: UNISOLATE_HOST_ROUTE_V2,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canUnIsolateHost'] },
      logger,
      responseActionRequestHandler(endpointContext, 'unisolate')
    )
  );

  router.post(
    {
      path: KILL_PROCESS_ROUTE,
      validate: KillOrSuspendProcessRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canKillProcess'] },
      logger,
      responseActionRequestHandler<ResponseActionParametersWithPidOrEntityId>(
        endpointContext,
        'kill-process'
      )
    )
  );

  router.post(
    {
      path: SUSPEND_PROCESS_ROUTE,
      validate: KillOrSuspendProcessRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canSuspendProcess'] },
      logger,
      responseActionRequestHandler<ResponseActionParametersWithPidOrEntityId>(
        endpointContext,
        'suspend-process'
      )
    )
  );

  router.post(
    {
      path: GET_PROCESSES_ROUTE,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canGetRunningProcesses'] },
      logger,
      responseActionRequestHandler(endpointContext, 'running-processes')
    )
  );

  // `get-file` currently behind FF
  if (endpointContext.experimentalFeatures.responseActionGetFileEnabled) {
    router.post(
      {
        path: GET_FILE_ROUTE,
        validate: EndpointActionGetFileSchema,
        options: { authRequired: true, tags: ['access:securitySolution'] },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        responseActionRequestHandler(endpointContext, 'get-file')
      )
    );
  }
}

const commandToFeatureKeyMap = new Map<ResponseActionsApiCommandNames, FeatureKeys>([
  ['isolate', 'HOST_ISOLATION'],
  ['unisolate', 'HOST_ISOLATION'],
  ['kill-process', 'KILL_PROCESS'],
  ['suspend-process', 'SUSPEND_PROCESS'],
  ['running-processes', 'RUNNING_PROCESSES'],
  ['get-file', 'GET_FILE'],
]);

const returnActionIdCommands: ResponseActionsApiCommandNames[] = ['isolate', 'unisolate'];

function responseActionRequestHandler<T extends EndpointActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: ResponseActionsApiCommandNames
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof ResponseActionBodySchema>,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, req, res) => {
    const featureKey = commandToFeatureKeyMap.get(command) as FeatureKeys;
    if (featureKey) {
      endpointContext.service.getFeatureUsageService().notifyUsage(featureKey);
    }
    const user = endpointContext.service.security?.authc.getCurrentUser(req);

    // fetch the Agent IDs to send the commands to
    const endpointIDs = [...new Set(req.body.endpoint_ids)]; // dedupe
    const endpointData = await getMetadataForEndpoints(endpointIDs, context);

    const casesClient = await endpointContext.service.getCasesClient(req);

    // convert any alert IDs into cases
    let caseIDs: string[] = req.body.case_ids?.slice() || [];
    if (req.body.alert_ids && req.body.alert_ids.length > 0) {
      const newIDs: string[][] = await Promise.all(
        req.body.alert_ids.map(async (a: string) => {
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

    const agents = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);
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
          command,
          comment: req.body.comment ?? undefined,
          parameters: req.body.parameters ?? undefined,
        } as EndpointActionData<T>,
      } as Omit<EndpointAction, 'agents' | 'user_id' | '@timestamp'>,
      user: {
        id: user ? user.username : 'unknown',
      },
    };

    // if .logs-endpoint.actions data stream exists
    // try to create action request record in .logs-endpoint.actions DS as the current user
    // (from >= v7.16, use this check to ensure the current user has privileges to write to the new index)
    // and allow only users with superuser privileges to write to fleet indices
    const logger = endpointContext.logFactory.get('host-isolation');
    const doesLogsEndpointActionsDsExist = await doLogsEndpointActionDsExists({
      context,
      logger,
      dataStreamName: ENDPOINT_ACTIONS_DS,
    });

    // 8.0+ requires internal user to write to system indices
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    // if the new endpoint indices/data streams exists
    // write the action request to the new endpoint index
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
          return res.customError({
            statusCode: 500,
            body: {
              message: logsEndpointActionsResult.body.result,
            },
          });
        }
      } catch (e) {
        return res.customError({
          statusCode: 500,
          body: { message: e },
        });
      }
    }

    // write actions to .fleet-actions index
    try {
      fleetActionIndexResult = await esClient.index<EndpointAction>(
        {
          index: AGENT_ACTIONS_INDEX,
          body: {
            ...doc.EndpointActions,
            '@timestamp': doc['@timestamp'],
            agents,
            timeout: 300, // 5 minutes
            user_id: doc.user.id,
          },
          refresh: 'wait_for',
        },
        { meta: true }
      );

      if (fleetActionIndexResult.statusCode !== 201) {
        return res.customError({
          statusCode: 500,
          body: {
            message: fleetActionIndexResult.body.result,
          },
        });
      }
    } catch (e) {
      // create entry in .logs-endpoint.action.responses-default data stream
      // when writing to .fleet-actions fails
      if (doesLogsEndpointActionsDsExist) {
        await createFailedActionResponseEntry({
          context,
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
      return res.customError({
        statusCode: 500,
        body: { message: e },
      });
    }

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
              comment: req.body.comment || '',
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

    return res.ok({
      body: {
        ...body,
        data,
      },
    });
  };
}

const createFailedActionResponseEntry = async ({
  context,
  doc,
  logger,
}: {
  context: SecuritySolutionRequestHandlerContext;
  doc: LogsEndpointActionResponse;
  logger: Logger;
}): Promise<void> => {
  // 8.0+ requires internal user to write to system indices
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
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

function redirectHandler(
  location: string
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof NoParametersRequestSchema.body>,
  SecuritySolutionRequestHandlerContext
> {
  return async (_context, _req, res) => {
    return res.custom({
      statusCode: 308,
      headers: { location },
    });
  };
}

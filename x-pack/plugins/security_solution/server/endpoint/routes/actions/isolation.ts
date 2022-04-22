/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RequestHandler, Logger } from '@kbn/core/server';
import uuid from 'uuid';
import { TypeOf } from '@kbn/config-schema';
import { CommentType } from '@kbn/cases-plugin/common';
import { CasesByAlertId } from '@kbn/cases-plugin/common/api/cases/case';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { HostIsolationRequestSchema } from '../../../../common/endpoint/schema/actions';
import {
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTION_RESPONSES_DS,
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  failedFleetActionErrorCode,
} from '../../../../common/endpoint/constants';
import {
  EndpointAction,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { getMetadataForEndpoints } from '../../services';
import { EndpointAppContext } from '../../types';
import { APP_ID } from '../../../../common/constants';
import { doLogsEndpointActionDsExists } from '../../utils';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the Host-(un-)isolation routes
 */
export function registerHostIsolationRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  // perform isolation
  router.post(
    {
      path: ISOLATE_HOST_ROUTE,
      validate: HostIsolationRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canIsolateHost'] },
      logger,
      isolationRequestHandler(endpointContext, true)
    )
  );

  // perform UN-isolate
  router.post(
    {
      path: UNISOLATE_HOST_ROUTE,
      validate: HostIsolationRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canUnIsolateHost'] },
      logger,
      isolationRequestHandler(endpointContext, false)
    )
  );
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

export const isolationRequestHandler = function (
  endpointContext: EndpointAppContext,
  isolate: boolean
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof HostIsolationRequestSchema.body>,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, req, res) => {
    endpointContext.service.getFeatureUsageService().notifyUsage('HOST_ISOLATION');
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
    const actionID = uuid.v4();

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
          command: isolate ? 'isolate' : 'unisolate',
          comment: req.body.comment ?? undefined,
        },
      } as Omit<EndpointAction, 'agents' | 'user_id'>,
      user: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: user!.username,
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
            index: `${ENDPOINT_ACTIONS_DS}-default`,
            body: {
              ...doc,
            },
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
                type: isolate ? 'isolate' : 'unisolate',
              },
              owner: APP_ID,
            },
          })
        )
      );
    }

    return res.ok({
      body: {
        action: actionID,
      },
    });
  };
};

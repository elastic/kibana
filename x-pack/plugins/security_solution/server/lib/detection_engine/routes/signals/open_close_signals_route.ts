/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ALERT_WORKFLOW_USER,
} from '@kbn/rule-data-utils';
import type { ElasticsearchClient, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SetAlertsStatusRequestBody } from '../../../../../common/api/detection_engine/signals';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { INSIGHTS_CHANNEL } from '../../../telemetry/constants';
import type { StartPlugins } from '../../../../plugin';
import {
  getSessionIDfromKibanaRequest,
  createAlertStatusPayloads,
} from '../../../telemetry/insights';

export const setSignalsStatusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  sender: ITelemetryEventsSender,
  startServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertsStatusRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { status } = request.body;
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();
        const siemResponse = buildSiemResponse(response);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const [_, { security }] = await startServices();
        const user = security.authc.getCurrentUser(request);

        const clusterId = sender.getClusterID();
        const [isTelemetryOptedIn, username] = await Promise.all([
          sender.isTelemetryOptedIn(),
          security?.authc.getCurrentUser(request)?.username,
        ]);

        if (isTelemetryOptedIn && clusterId) {
          // Sometimes the ids are in the query not passed in the request?
          const toSendAlertIds =
            'signal_ids' in request.body
              ? request.body.signal_ids
              : (get(request.body.query, 'bool.filter.terms._id') as string[]);
          // Get Context for Insights Payloads
          const sessionId = getSessionIDfromKibanaRequest(clusterId, request);
          if (username && toSendAlertIds && sessionId && status) {
            const insightsPayloads = createAlertStatusPayloads(
              clusterId,
              toSendAlertIds,
              sessionId,
              username,
              DETECTION_ENGINE_SIGNALS_STATUS_URL,
              status
            );
            logger.debug(`Sending Insights Payloads ${JSON.stringify(insightsPayloads)}`);
            await sender.sendOnDemand(INSIGHTS_CHANNEL, insightsPayloads);
          }
        }

        try {
          if ('signal_ids' in request.body) {
            const { signal_ids: signalIds } = request.body;

            const body = await updateSignalsStatusByIds(status, signalIds, spaceId, esClient, user);

            return response.ok({ body });
          } else {
            const { conflicts, query } = request.body;

            const body = await updateSignalsStatusByQuery(
              status,
              query,
              { conflicts: conflicts ?? 'abort' },
              spaceId,
              esClient,
              user
            );

            return response.ok({ body });
          }
        } catch (err) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

const updateSignalsStatusByIds = async (
  status: SetAlertsStatusRequestBody['status'],
  signalsId: string[],
  spaceId: string,
  esClient: ElasticsearchClient,
  user: AuthenticatedUser | null
) =>
  esClient.updateByQuery({
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    refresh: true,
    body: {
      script: getUpdateSignalStatusScript(status, user),
      query: {
        bool: {
          filter: { terms: { _id: signalsId } },
        },
      },
    },
    ignore_unavailable: true,
  });

/**
 * Please avoid using `updateSignalsStatusByQuery` when possible, use `updateSignalsStatusByIds` instead.
 *
 * This method calls `updateByQuery` with `refresh: true` which is expensive on serverless.
 */
const updateSignalsStatusByQuery = async (
  status: SetAlertsStatusRequestBody['status'],
  query: object | undefined,
  options: { conflicts: 'abort' | 'proceed' },
  spaceId: string,
  esClient: ElasticsearchClient,
  user: AuthenticatedUser | null
) =>
  esClient.updateByQuery({
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    conflicts: options.conflicts,
    refresh: true,
    body: {
      script: getUpdateSignalStatusScript(status, user),
      query: {
        bool: {
          filter: query,
        },
      },
    },
    ignore_unavailable: true,
  });

const getUpdateSignalStatusScript = (
  status: SetAlertsStatusRequestBody['status'],
  user: AuthenticatedUser | null
) => ({
  source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null && ctx._source['${ALERT_WORKFLOW_STATUS}'] != '${status}') {
      ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}';
      ctx._source['${ALERT_WORKFLOW_USER}'] = ${
    user?.profile_uid ? `'${user.profile_uid}'` : 'null'
  };
      ctx._source['${ALERT_WORKFLOW_STATUS_UPDATED_AT}'] = '${new Date().toISOString()}';
    }
    if (ctx._source.signal != null && ctx._source.signal.status != null) {
      ctx._source.signal.status = '${status}'
    }`,
  lang: 'painless',
});

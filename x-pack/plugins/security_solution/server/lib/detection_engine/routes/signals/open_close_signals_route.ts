/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  setSignalStatusValidateTypeDependents,
  setSignalsStatusSchema,
} from '../../../../../common/api/detection_engine/signals';
import type { SetSignalsStatusSchemaDecoded } from '../../../../../common/api/detection_engine/signals';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { INSIGHTS_CHANNEL } from '../../../telemetry/constants';
import type { SetupPlugins } from '../../../../plugin';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  getSessionIDfromKibanaRequest,
  createAlertStatusPayloads,
} from '../../../telemetry/insights';

export const setSignalsStatusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security'],
  sender: ITelemetryEventsSender
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
            body: buildRouteValidation<
              typeof setSignalsStatusSchema,
              SetSignalsStatusSchemaDecoded
            >(setSignalsStatusSchema),
          },
        },
      },
      async (context, request, response) => {
        const { conflicts, signal_ids: signalIds, query, status } = request.body;
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();
        const siemResponse = buildSiemResponse(response);
        const validationErrors = setSignalStatusValidateTypeDependents(request.body);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const clusterId = sender.getClusterID();
        const [isTelemetryOptedIn, username] = await Promise.all([
          sender.isTelemetryOptedIn(),
          security?.authc.getCurrentUser(request)?.username,
        ]);
        if (isTelemetryOptedIn && clusterId) {
          // Sometimes the ids are in the query not passed in the request?
          const toSendAlertIds = get(query, 'bool.filter.terms._id') || signalIds;
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
          if (signalIds) {
            const body = await updateSignalsStatusByIds(status, signalIds, spaceId, esClient);
            return response.ok({ body });
          } else {
            const body = await updateSignalsStatusByQuery(
              status,
              query,
              { conflicts: conflicts ?? 'abort' },
              spaceId,
              esClient
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
  status: SetSignalsStatusSchemaDecoded['status'],
  signalsId: string[],
  spaceId: string,
  esClient: ElasticsearchClient
) =>
  esClient.updateByQuery({
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    refresh: true,
    body: {
      script: getUpdateSignalStatusScript(status),
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
  status: SetSignalsStatusSchemaDecoded['status'],
  query: object | undefined,
  options: { conflicts: 'abort' | 'proceed' },
  spaceId: string,
  esClient: ElasticsearchClient
) =>
  esClient.updateByQuery({
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    conflicts: options.conflicts,
    refresh: true,
    body: {
      script: getUpdateSignalStatusScript(status),
      query: {
        bool: {
          filter: query,
        },
      },
    },
    ignore_unavailable: true,
  });

const getUpdateSignalStatusScript = (status: SetSignalsStatusSchemaDecoded['status']) => ({
  source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
      ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}'
    }
    if (ctx._source.signal != null && ctx._source.signal.status != null) {
      ctx._source.signal.status = '${status}'
    }`,
  lang: 'painless',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { Logger } from 'src/core/server';
import { setSignalStatusValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/set_signal_status_type_dependents';
import {
  SetSignalsStatusSchemaDecoded,
  setSignalsStatusSchema,
} from '../../../../../common/detection_engine/schemas/request/set_signal_status_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { ITelemetryEventsSender } from '../../../telemetry/sender';
import { INSIGHTS_CHANNEL } from '../../../telemetry/constants';
import { SetupPlugins } from '../../../../plugin';
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
  router.post(
    {
      path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
      validate: {
        body: buildRouteValidation<typeof setSignalsStatusSchema, SetSignalsStatusSchemaDecoded>(
          setSignalsStatusSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { conflicts, signal_ids: signalIds, query, status } = request.body;
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const siemClient = context.securitySolution?.getAppClient();
      const siemResponse = buildSiemResponse(response);
      const validationErrors = setSignalStatusValidateTypeDependents(request.body);
      const spaceId = context.securitySolution?.getSpaceId() ?? 'default';

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

      let queryObject;
      if (signalIds) {
        queryObject = { ids: { values: signalIds } };
      }
      if (query) {
        queryObject = {
          bool: {
            filter: query,
          },
        };
      }
      try {
        const body = await esClient.updateByQuery({
          index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
          conflicts: conflicts ?? 'abort',
          // https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update-by-query.html#_refreshing_shards_2
          // Note: Before we tried to use "refresh: wait_for" but I do not think that was available and instead it defaulted to "refresh: true"
          // but the tests do not pass with "refresh: false". If at some point a "refresh: wait_for" is implemented, we should use that instead.
          refresh: true,
          body: {
            script: {
              source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}'
              }
              if (ctx._source.signal != null && ctx._source.signal.status != null) {
                ctx._source.signal.status = '${status}'
              }`,
              lang: 'painless',
            },
            query: queryObject,
          },
          ignore_unavailable: true,
        });
        return response.ok({ body });
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

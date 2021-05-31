/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { parseExperimentalConfigValue } from '../../../../../common/experimental_features';
import { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

import {
  querySignalsSchema,
  QuerySignalsSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/query_signals_index_schema';

export const querySignalsRoute = (router: SecuritySolutionPluginRouter, config: ConfigType) => {
  router.post(
    {
      path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
      validate: {
        body: buildRouteValidation<typeof querySignalsSchema, QuerySignalsSchemaDecoded>(
          querySignalsSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { query, aggs, _source, track_total_hits, size } = request.body;
      const siemResponse = buildSiemResponse(response);
      if (
        query == null &&
        aggs == null &&
        _source == null &&
        track_total_hits == null &&
        size == null
      ) {
        return siemResponse.error({
          statusCode: 400,
          body: '"value" must have at least 1 children',
        });
      }
      const clusterClient = context.core.elasticsearch.legacy.client;
      const siemClient = context.securitySolution!.getAppClient();

      // TODO: Once we are past experimental phase this code should be removed
      const { ruleRegistryEnabled } = parseExperimentalConfigValue(config.enableExperimental);

      try {
        const result = await clusterClient.callAsCurrentUser('search', {
          index: ruleRegistryEnabled ? DEFAULT_ALERTS_INDEX : siemClient.getSignalsIndex(),
          body: { query, aggs, _source, track_total_hits, size },
          ignoreUnavailable: true,
        });
        return response.ok({ body: result });
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

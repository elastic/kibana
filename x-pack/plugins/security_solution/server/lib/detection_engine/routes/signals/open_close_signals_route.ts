/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setSignalStatusValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/set_signal_status_type_dependents';
import {
  SetSignalsStatusSchemaDecoded,
  setSignalsStatusSchema,
} from '../../../../../common/detection_engine/schemas/request/set_signal_status_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

export const setSignalsStatusRoute = (router: IRouter) => {
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
      const { signal_ids: signalIds, query, status } = request.body;
      const clusterClient = context.core.elasticsearch.legacy.client;
      const siemClient = context.securitySolution?.getAppClient();
      const siemResponse = buildSiemResponse(response);
      const validationErrors = setSignalStatusValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      if (!siemClient) {
        return siemResponse.error({ statusCode: 404 });
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
        const result = await clusterClient.callAsCurrentUser('updateByQuery', {
          index: siemClient.getSignalsIndex(),
          refresh: 'wait_for',
          body: {
            script: {
              source: `ctx._source.signal.status = '${status}'`,
              lang: 'painless',
            },
            query: queryObject,
          },
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

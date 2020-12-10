/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../lib/infra_types';
import { throwErrors } from '../../../common/runtime_types';
import { createSearchClient } from '../../lib/create_search_client';
import { getProcessList } from '../../lib/host_details/process_list';
import { getProcessListChart } from '../../lib/host_details/process_list_chart';
import {
  ProcessListAPIRequestRT,
  ProcessListAPIResponseRT,
  ProcessListAPIChartRequestRT,
  ProcessListAPIChartResponseRT,
} from '../../../common/http_api';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initProcessListRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/process_list',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const options = pipe(
          ProcessListAPIRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = createSearchClient(requestContext, framework);
        const processListResponse = await getProcessList(client, options);

        return response.ok({
          body: ProcessListAPIResponseRT.encode(processListResponse),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/process_list/chart',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const options = pipe(
          ProcessListAPIChartRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = createSearchClient(requestContext, framework);
        const processListResponse = await getProcessListChart(client, options);

        return response.ok({
          body: ProcessListAPIChartResponseRT.encode(processListResponse),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};

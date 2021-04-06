/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../src/core/server';
import { METRICS_SUMMARY_TRANSFORMS } from '../../common/constants';
import { ModuleNames } from '../modules';

import { getMetricsSummaryClient } from './utils/get_metrics_summary_client';

/**
 * Creates transforms.
 * @param router The router to get the collection of transforms
 */
export const postTransforms = (router: IRouter): void => {
  router.post(
    {
      path: METRICS_SUMMARY_TRANSFORMS,
      // TODO: Add the namespace and the key and the type
      validate: {
        // TODO: Add the validation instead of allowing handler to have access to raw non-validated in runtime
        body: schema.object({}, { unknowns: 'allow' }),
        query: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      // TODO: Type this through validation above and remove the weird casting of: "as { modules: ModuleNames };"
      // TODO: Validate for runtime that the module exists or not and throw before pushing the module name lower
      // TODO: Change modules to be part of the body and become an array of values
      // TODO: Wrap this in a try catch block and report errors
      const {
        modules,
        auto_start: autoStart = false,
        settings: {
          max_page_search_size: maxPageSearchSize = 500,
          docs_per_second: docsPerSecond = null,
        } = {
          docsPerSecond: null,
          maxPageSearchSize: 500,
        },
        frequency = '1m',
        indices,
        query = { match_all: {} },
        prefix = '',
        suffix = '',
        sync = {
          time: {
            delay: '60s',
            field: '@timestamp',
          },
        },
      } = request.body as {
        modules: ModuleNames[];
        auto_start: boolean;
        indices: string[];
        prefix: string;
        query: object;
        suffix: string;
        frequency: string;
        settings: {
          max_page_search_size: number;
          docs_per_second: number;
        };
        sync: {
          time: {
            delay: string;
            field: string;
          };
        };
      };
      const metrics = getMetricsSummaryClient(context);
      await metrics.postTransforms({
        autoStart,
        docsPerSecond,
        frequency,
        indices,
        maxPageSearchSize,
        modules,
        prefix,
        query,
        suffix,
        sync,
      });

      return response.custom({
        body: { acknowledged: true },
        statusCode: 201,
      });
    }
  );
};

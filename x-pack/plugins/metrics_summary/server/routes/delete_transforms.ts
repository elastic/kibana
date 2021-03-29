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
 * Deletes transforms.
 * NOTE: We use a POST rather than a DELETE on purpose here to ensure that there
 * are not problems with the body being sent.
 * @param router The router to delete the collection of transforms
 */
export const deleteTransforms = (router: IRouter): void => {
  router.post(
    {
      path: `${METRICS_SUMMARY_TRANSFORMS}/_delete`,
      // TODO: Add the namespace
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
      const { modules, prefix = '', suffix = '' } = request.body as {
        modules: ModuleNames[];
        prefix: string;
        suffix: string;
      };
      const metrics = getMetricsSummaryClient(context);
      await metrics.deleteTransforms({ modules, prefix, suffix });

      return response.custom({
        statusCode: 204,
      });
    }
  );
};

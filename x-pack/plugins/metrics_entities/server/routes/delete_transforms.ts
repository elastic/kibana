/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../src/core/server';
import { METRICS_ENTITIES_TRANSFORMS } from '../../common/constants';
import { ModuleNames } from '../modules';

import { getMetricsEntitiesClient } from './utils/get_metrics_entities_client';

/**
 * Deletes transforms.
 * NOTE: We use a POST rather than a DELETE on purpose here to ensure that there
 * are not problems with the body being sent.
 * @param router The router to delete the collection of transforms
 */
export const deleteTransforms = (router: IRouter): void => {
  router.post(
    {
      path: `${METRICS_ENTITIES_TRANSFORMS}/_delete`,
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
        prefix = '',
        suffix = '',
      } = request.body as {
        modules: ModuleNames[];
        prefix: string;
        suffix: string;
      };
      const metrics = getMetricsEntitiesClient(context);
      await metrics.deleteTransforms({ modules, prefix, suffix });

      return response.custom({
        statusCode: 204,
      });
    }
  );
};

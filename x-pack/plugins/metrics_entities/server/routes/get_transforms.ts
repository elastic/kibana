/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../../../../src/core/server';
import { METRICS_ENTITIES_TRANSFORMS } from '../../common/constants';

import { getMetricsEntitiesClient } from './utils/get_metrics_entities_client';

/**
 * Returns a transform given a parameter of:
 *   namespace - The namespace for the transform group (default if not given is empty string)
 *   key - A key which will be hashed as part of the string (default if not given is empty string)
 *   type - Either metric or entities (default is metrics)
 *   module - The module name of the transforms
 * Example:
 *   GET /api/metrics_entities/transforms?namespace=myNamespace&key=myKey
 * @param router The router to get the collection of transforms
 */
export const getTransforms = (router: IRouter): void => {
  router.get(
    {
      path: METRICS_ENTITIES_TRANSFORMS,
      // TODO: Add the validation instead of false
      // TODO: Add the namespace and the key and the type
      validate: false,
    },
    async (context, _, response) => {
      const metrics = getMetricsEntitiesClient(context);
      const summaries = await metrics.getTransforms();
      return response.ok({
        body: {
          summaries,
        },
      });
    }
  );
};

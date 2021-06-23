/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import { METRICS_ENTITIES_TRANSFORMS } from '../../common/constants';

import { getMetricsEntitiesClient } from './utils/get_metrics_entities_client';

/**
 * Returns all transforms from all modules
 * TODO: Add support for specific modules and prefix
 * @param router The router to get the collection of transforms
 */
export const getTransforms = (router: IRouter): void => {
  router.get(
    {
      path: METRICS_ENTITIES_TRANSFORMS,
      // TODO: Add the validation instead of false
      // TODO: Add the prefix and module support
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

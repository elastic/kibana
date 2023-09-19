/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { TransformHealthIssue } from '../../../common/types/transform_stats';
import { TRANSFORM_HEALTH } from '../../../common/constants';
import type { TransformListRow } from './transform_list';
import { isTransformListRowWithStats } from './transform_list';

export const needsReauthorization = (transform: Partial<TransformListRow>) => {
  return (
    isTransformListRowWithStats(transform) &&
    isPopulatedObject(transform.config?.authorization, ['api_key']) &&
    transform.stats.health.status === TRANSFORM_HEALTH.red &&
    transform.stats.health.issues?.find(
      (issue) => (issue as TransformHealthIssue).issue === 'Privileges check failed'
    ) !== undefined
  );
};

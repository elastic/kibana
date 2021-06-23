/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';

export const metricAnomalyAlertTypeParamsSchema = schema.object(
  {
    nodeType: oneOfLiterals(['hosts', 'k8s']),
    alertInterval: schema.string(),
    metric: oneOfLiterals(['memory_usage', 'network_in', 'network_out']),
    threshold: schema.number(),
    filterQuery: schema.maybe(schema.string({ validate: validateIsStringElasticsearchJSONFilter })),
    sourceId: schema.string(),
    spaceId: schema.string(),
  },
  { unknowns: 'allow' }
);

export type MetricAnomalyAlertTypeParams = TypeOf<typeof metricAnomalyAlertTypeParamsSchema>;

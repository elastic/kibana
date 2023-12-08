/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const benchmarkScoreSchema = schema.object({
  postureScore: schema.number({ defaultValue: 0, min: 0 }),
  resourcesEvaluated: schema.number({ defaultValue: 0, min: 0 }),
  totalFailed: schema.number({ defaultValue: 0, min: 0 }),
  totalFindings: schema.number({ defaultValue: 0, min: 0 }),
  totalPassed: schema.number({ defaultValue: 0, min: 0 }),
});

export type BenchmarkScore = TypeOf<typeof benchmarkScoreSchema>;

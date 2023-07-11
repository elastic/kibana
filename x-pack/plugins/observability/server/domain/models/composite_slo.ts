/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  compositeSloSchema,
  compositeSloIdSchema,
  weightedAverageSourceSchema,
} from '@kbn/slo-schema';

type CompositeSLO = t.TypeOf<typeof compositeSloSchema>;
type CompositeSLOId = t.TypeOf<typeof compositeSloIdSchema>;
type StoredCompositeSLO = t.OutputOf<typeof compositeSloSchema>;

type WeightedAverageSource = t.TypeOf<typeof weightedAverageSourceSchema>;

export type { CompositeSLO, CompositeSLOId, StoredCompositeSLO, WeightedAverageSource };

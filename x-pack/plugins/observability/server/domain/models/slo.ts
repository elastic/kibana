/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { sloIdSchema, sloSchema, sloWithSummarySchema } from '@kbn/slo-schema';

type SLO = t.TypeOf<typeof sloSchema>;
type SLOId = t.TypeOf<typeof sloIdSchema>;
type SLOWithSummary = t.TypeOf<typeof sloWithSummarySchema>;
type StoredSLO = t.OutputOf<typeof sloSchema>;

export type { SLO, SLOWithSummary, SLOId, StoredSLO };

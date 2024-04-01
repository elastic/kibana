/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { sloDefinitionSchema, sloIdSchema, sloSchema, sloWithSummarySchema } from '@kbn/slo-schema';

type SLO = t.TypeOf<typeof sloSchema>;

type SLODefinition = t.TypeOf<typeof sloDefinitionSchema>;
type StoredSLODefinition = t.OutputOf<typeof sloDefinitionSchema>;

type SLOId = t.TypeOf<typeof sloIdSchema>;
type SLOWithSummary = t.TypeOf<typeof sloWithSummarySchema>;

export type { SLO, SLODefinition, StoredSLODefinition, SLOWithSummary, SLOId };

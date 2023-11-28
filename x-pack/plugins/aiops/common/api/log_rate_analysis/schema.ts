/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsLogRateAnalysisSchemaV1 } from './schema_v1';
import type { AiopsLogRateAnalysisSchemaV2 } from './schema_v2';

export type AiopsLogRateAnalysisApiVersion = '1' | '2';

const LATEST_API_VERSION: AiopsLogRateAnalysisApiVersion = '2';

export type AiopsLogRateAnalysisSchema<
  T extends AiopsLogRateAnalysisApiVersion = typeof LATEST_API_VERSION
> = T extends '1'
  ? AiopsLogRateAnalysisSchemaV1
  : T extends '2'
  ? AiopsLogRateAnalysisSchemaV2
  : never;

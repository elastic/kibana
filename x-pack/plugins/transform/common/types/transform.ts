/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { PutTransformsRequestSchema } from '../api_schemas/transforms';

export type IndexName = string;
export type IndexPattern = string;
export type TransformId = string;

export interface TransformPivotConfig extends PutTransformsRequestSchema {
  id: TransformId;
  create_time?: number;
  version?: string;
}

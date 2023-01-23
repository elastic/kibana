/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import type { BaseParams, BasePayload } from '../base';

interface CsvFromSavedObjectBase {
  objectType: 'saved search';
  state?: {
    query: estypes.QueryDslQueryContainer | estypes.QueryDslQueryContainer[];
  };
  timerange?: {
    timezone?: string;
    min?: string | number;
    max?: string | number;
  };
  savedObjectId: string;
}

export type JobParamsCsvFromSavedObject = CsvFromSavedObjectBase & BaseParams;
export type TaskPayloadCsvFromSavedObject = CsvFromSavedObjectBase & BasePayload;

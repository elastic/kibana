/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseParams, BasePayload } from '../base';

export interface JobParamsCsvFromSavedObject extends BaseParams {
  objectType: 'saved search';
  timerange?: {
    min: string | number | null;
    max: string | number | null;
  };
  savedObjectId: string;
}

export interface TaskPayloadCsvFromSavedObject extends BasePayload {
  objectType: 'saved search';
  timerange?: {
    min: string | number | null;
    max: string | number | null;
  };
  savedObjectId: string;
}

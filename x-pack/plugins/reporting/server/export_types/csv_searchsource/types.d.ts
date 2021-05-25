/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchSourceFields } from 'src/plugins/data/common';
import type { BaseParams, BasePayload } from '../../types';

export type RawValue = string | object | null | undefined;

interface BaseParamsCSV {
  browserTimezone: string;
  searchSource: SearchSourceFields;
  columns?: string[];
}

export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;

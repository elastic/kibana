/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorRaw } from '../../typings/es_schemas/raw/error_raw';
import { TimestampUs } from '../../typings/es_schemas/raw/fields/timestamp_us';

export interface WaterfallErrorDoc {
  timestamp: TimestampUs;
  trace: { id?: string };
  transaction: {
    id?: string;
  };
  parent: { id?: string };
  error: ErrorRaw['error'];
  service: {
    name: string;
  };
}

export interface RootTransaction {
  trace: { id: string };
  transaction: {
    duration: TimestampUs;
    id: string;
    name: string;
    type: string;
  };
  service: {
    name: string;
    environment?: string;
  };
}

export const INITIAL_DATA = {
  entryWaterfallTransaction: undefined,
  rootTransaction: undefined,
  exceedsMax: false,
  totalErrorsCount: 0,
  duration: 0,
  items: [],
  legends: [],
  errorItems: [],
  childrenByParentId: {},
  errorCountById: {},
};

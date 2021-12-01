/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ensure, SerializableRecord } from '@kbn/utility-types';
import type { LayoutParams } from './layout';

export type JobId = string;

export type BaseParams = Ensure<
  {
    layout?: LayoutParams;
    objectType: string;
    title: string;
    browserTimezone: string; // to format dates in the user's time zone
    version: string; // to handle any state migrations
  },
  SerializableRecord
>;

// base params decorated with encrypted headers that come into runJob functions
export interface BasePayload extends BaseParams {
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

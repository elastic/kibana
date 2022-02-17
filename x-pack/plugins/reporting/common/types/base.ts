/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ensure, SerializableRecord } from '@kbn/utility-types';
import type { LayoutParams } from '../../../screenshotting/common';
import { LocatorParams } from './url';

export type JobId = string;

/**
 * @deprecated
 */
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

/**
 * Report job parameters that an application must return from its
 * getSharingData function.
 */
export type BaseParamsV2 = BaseParams & {
  locatorParams: LocatorParams[];
};

/**
 * @deprecated
 */
export interface BasePayload extends BaseParams {
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

/**
 * Report job parameters, after they are processed in the request handler.
 */
export interface BasePayloadV2 extends BaseParamsV2 {
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

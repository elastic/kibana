/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseParams, BasePayload } from '../../../server/types';
import { LayoutParams } from '../../lib/layouts';

// Job params: structure of incoming user request data
export interface JobParamsPNG extends BaseParams {
  title: string;
  relativeUrl: string;
}

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPNG extends BasePayload<JobParamsPNG> {
  browserTimezone: string;
  forceNow?: string;
  layout: LayoutParams;
  relativeUrl: string;
}

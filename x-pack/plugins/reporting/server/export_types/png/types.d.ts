/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayoutParams } from '../../lib/layouts';
import { BaseParams, BasePayload } from '../../types';

interface BaseParamsPNG {
  layout: LayoutParams;
  forceNow?: string;
  relativeUrl: string;
}

// Job params: structure of incoming user request data
export type JobParamsPNG = BaseParamsPNG & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPNG = BaseParamsPNG & BasePayload;

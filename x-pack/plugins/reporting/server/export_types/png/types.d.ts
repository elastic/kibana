/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayoutParams } from '../../lib/layouts';
import { BaseParams, BasePayload } from '../../types';

interface BaseParamsPNG {
  layout: LayoutParams;
  relativeUrl: string;
}

// Job params: structure of incoming user request data
export type JobParamsPNG = BaseParamsPNG & BaseParams;

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPNG extends BaseParamsPNG, BasePayload {
  forceNow: string;
}

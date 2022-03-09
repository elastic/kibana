/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutParams } from '../../../../screenshotting/common';
import type { BaseParams, BasePayload } from '../base';

interface BaseParamsPNG {
  layout: LayoutParams;
  forceNow?: string;
  relativeUrl: string;
}

// Job params: structure of incoming user request data
/**
 * @deprecated
 */
export type JobParamsPNGDeprecated = BaseParamsPNG & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPNG = BaseParamsPNG & BasePayload;

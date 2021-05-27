/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayoutParams } from '../../../lib/layouts';
import { BaseParams, BasePayload } from '../../../types';

interface BaseParamsPDFV2<P = object> {
  layout: LayoutParams;
  forceNow?: string;
  locator: {
    id: string;
    params: P;
  };
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDFV2 = BaseParamsPDFV2 & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPDFV2 = BaseParamsPDFV2 & BasePayload;

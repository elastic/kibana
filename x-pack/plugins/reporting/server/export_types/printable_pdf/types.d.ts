/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayoutParams } from '../../lib/layouts';
import { BaseParams, BasePayload } from '../../types';

interface BaseParamsPDF {
  layout: LayoutParams;
  forceNow?: string;
  relativeUrls: string[];
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDF = BaseParamsPDF & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPDF = BaseParamsPDF & BasePayload;

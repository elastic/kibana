/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutParams } from '../layout';
import type { BaseParams, BasePayload } from '../base';

interface BaseParamsPDF {
  layout: LayoutParams;
  relativeUrls: string[];
  isDeprecated?: boolean;
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDF = BaseParamsPDF & BaseParams;

export type JobAppParamsPDF = Omit<JobParamsPDF, 'browserTimezone' | 'version'>;

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPDF extends BasePayload {
  layout: LayoutParams;
  forceNow?: string;
  objects: Array<{ relativeUrl: string }>;
}

export interface JobParamsPDFLegacy extends Omit<JobParamsPDF, 'relativeUrls'> {
  savedObjectId: string;
  queryString: string;
}

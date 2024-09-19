/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayoutParams } from '../../lib/layouts';
import { BaseParams, BasePayload } from '../../types';

interface BaseParamsPDF {
  layout: LayoutParams;
  relativeUrls: string[];
  isDeprecated?: boolean;
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDF = BaseParamsPDF & BaseParams;

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPDF extends BasePayload {
  layout: LayoutParams;
  forceNow?: string;
  objects: Array<{ relativeUrl: string }>;
}

type Legacy = Omit<JobParamsPDF, 'relativeUrls'>;
export interface JobParamsPDFLegacy extends Legacy {
  savedObjectId: string;
  queryString: string;
}

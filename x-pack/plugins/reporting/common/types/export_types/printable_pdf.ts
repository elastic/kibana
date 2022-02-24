/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutParams } from '../../../../screenshotting/common';
import type { BaseParams, BasePayload } from '../base';

interface BaseParamsPDF {
  layout: LayoutParams;
  relativeUrls: string[];
  isDeprecated?: boolean;
}

// Job params: structure of incoming user request data, after being parsed from RISON

/**
 * @deprecated
 */
export type JobParamsPDFDeprecated = BaseParamsPDF & BaseParams;

/**
 * @deprecated
 */
export type JobAppParamsPDF = Omit<JobParamsPDFDeprecated, 'browserTimezone' | 'version'>;

/**
 * Structure of stored job data provided by create_job
 */
export interface TaskPayloadPDF extends BasePayload {
  layout: LayoutParams;
  forceNow?: string;
  objects: Array<{ relativeUrl: string }>;
}

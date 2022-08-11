/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
import type { LocatorParams } from '../url';
import type { BaseParams, BasePayload } from '../base';

// Job params: structure of incoming user request data
export interface JobParamsPNGV2 extends BaseParams {
  layout: LayoutParams;
  /**
   * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
   */
  locatorParams: LocatorParams;
}

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPNGV2 extends BasePayload {
  layout: LayoutParams;
  forceNow: string;
  /**
   * Even though we only ever handle one locator for a PNG, we store it as an array for consistency with how PDFs are stored
   */
  locatorParams: LocatorParams[];
}

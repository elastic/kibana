/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import { LocatorParams } from '../../../common/types';
import { LayoutParams } from '../../lib/layouts';
import { BaseParams, BasePayload } from '../../types';

// Job params: structure of incoming user request data
export interface JobParamsPNGV2 extends BaseParams {
  layout: LayoutParams;
  forceNow: string;
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

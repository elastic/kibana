/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Locator } from '../../../../common/types';
import { LayoutParams } from '../../../lib/layouts';
import { BaseParams, BasePayload } from '../../../types';

interface BaseParamsPNGV2<P extends object = object> {
  layout: LayoutParams;
  forceNow?: string;
  /**
   * The parameters for the rendering job as specified by the consumer that requested the
   * report to be created. This value is typically used by the plugin client to re-create
   * the same visual state as when the report was requested as well as navigate to the correct page.
   */
  locator: Locator<P>;
}

// Job params: structure of incoming user request data
export type JobParamsPNGV2 = BaseParamsPNGV2 & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPNGV2 = BaseParamsPNGV2 & BasePayload;

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
  /**
   * The parameters for the rendering job as specified by the consumer that requested the
   * report to be created. This value is typically used by the plugin client to re-create
   * the same visual state as when the report was requested.
   */
  locator: {
    /**
     * The ID provided by the client so that they can discover this locator state when we start the browser and navigate to
     * their app.
     */
    id: string;
    version?: string;
    params: P;
  };
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDFV2 = BaseParamsPDFV2 & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPDFV2 = BaseParamsPDFV2 & BasePayload;

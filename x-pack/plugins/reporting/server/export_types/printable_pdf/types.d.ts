/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayoutParams } from '../../lib/layouts';
import { BaseParams, BasePayload } from '../../types';

interface BaseParamsPDF<B extends object = object> {
  layout: LayoutParams;
  forceNow?: string;
  // TODO: Add comment explaining this field
  relativeUrls: string[];

  /**
   * An optional value that will provided to the renderer (browser).
   *
   * This provides a way for capturing and forwarding any unsaved state from the consumer requesting a report to the
   * server-side report generator.
   *
   * Please note: this value will be stored and re-used whenever a specific report is generated. Therefore it is
   * advisable to assign a version to the body value or to implement some way of migrating values for use over time
   * as a report may be requested again in future with a body value created in legacy versions of the reporting consumer.
   */
  body?: {
    version?: string;
    /**
     * This value must be serializable for sending over the wire.
     */
    value: B;
  };
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDF = BaseParamsPDF & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPDF = BaseParamsPDF & BasePayload;

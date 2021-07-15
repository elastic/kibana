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

interface BaseParamsPDFV2<P extends SerializableState = SerializableState> {
  layout: LayoutParams;
  forceNow?: string;
  /**
   * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
   */
  locatorParams: Array<LocatorParams<P>>;
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDFV2 = BaseParamsPDFV2 & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPDFV2 = BaseParamsPDFV2 & BasePayload;

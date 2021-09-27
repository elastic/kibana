/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../src/plugins/data/common';

export interface FieldStatRawResponse {
  loading?: boolean;
  ccsWarning: false;
  took: 0;
}
export type FieldStatsRequest = IKibanaSearchRequest<{
  index: string;
  sessionId?: string;
}>;

export type FieldStatsResponse = IKibanaSearchResponse<FieldStatRawResponse>;

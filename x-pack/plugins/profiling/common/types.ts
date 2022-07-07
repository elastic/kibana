/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchRequest, IEsSearchResponse } from '@kbn/data-plugin/common';

export interface IMyStrategyRequest extends IEsSearchRequest {
  get_project_id: number;
  time_from: number;
  time_to: number;
  granularity: number;
}
export interface IMyStrategyResponse extends IEsSearchResponse {
  executed_at: number;
}

export interface TimeRange {
  start: string;
  end: string;
}

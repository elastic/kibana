/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IKibanaSearchRequest } from 'src/plugins/data/common';
import { ExpressionValueFilter } from '.';
export interface EssqlSearchStrategyRequest extends IKibanaSearchRequest {
  count: number;
  query: string;
  params?: Array<string | number | boolean>;
  timezone?: string;
  filter: ExpressionValueFilter[];
}

export interface EssqlSearchStrategyResponse {
  columns: Array<{
    id: string;
    name: string;
    meta: {
      type: string;
    };
  }>;
  rows: any[];

  rawResponse: estypes.SqlQueryResponse;
}

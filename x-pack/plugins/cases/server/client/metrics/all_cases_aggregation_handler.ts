/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesMetricsResponse } from '../../../common/api';
import { AggregationHandler } from './aggregation_handler';
import type { AggregationBuilder, AllCasesBaseHandlerCommonOptions } from './types';

export abstract class AllCasesAggregationHandler extends AggregationHandler<CasesMetricsResponse> {
  protected readonly from?: string;
  protected readonly to?: string;
  protected readonly owner?: string | string[];

  constructor(
    options: AllCasesBaseHandlerCommonOptions,
    aggregations: Map<string, AggregationBuilder<CasesMetricsResponse>>
  ) {
    const { owner, from, to, ...restOptions } = options;
    super(restOptions, aggregations);

    this.from = from;
    this.to = to;
    this.owner = owner;
  }
}

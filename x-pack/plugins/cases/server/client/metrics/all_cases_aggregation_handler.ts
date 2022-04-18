/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesMetricsResponse } from '../../../common/api';
import { AggregationHandler } from './aggregation_handler';
import { AggregationBuilder, AllCasesBaseHandlerCommonOptions } from './types';

export abstract class AllCasesAggregationHandler extends AggregationHandler<CasesMetricsResponse> {
  protected readonly owner?: string | string[];

  constructor(
    options: AllCasesBaseHandlerCommonOptions,
    aggregations: Map<string, AggregationBuilder<CasesMetricsResponse>>
  ) {
    const { owner, ...restOptions } = options;
    super(restOptions, aggregations);

    this.owner = owner;
  }
}

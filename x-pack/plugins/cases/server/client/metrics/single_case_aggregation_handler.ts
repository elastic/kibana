/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleCaseMetricsResponse } from '../../../common/api';
import { AggregationHandler } from './aggregation_handler';
import type { AggregationBuilder, SingleCaseBaseHandlerCommonOptions } from './types';

export abstract class SingleCaseAggregationHandler extends AggregationHandler<SingleCaseMetricsResponse> {
  protected readonly caseId: string;

  constructor(
    options: SingleCaseBaseHandlerCommonOptions,
    aggregations: Map<string, AggregationBuilder<SingleCaseMetricsResponse>>
  ) {
    const { caseId, ...restOptions } = options;
    super(restOptions, aggregations);

    this.caseId = caseId;
  }
}

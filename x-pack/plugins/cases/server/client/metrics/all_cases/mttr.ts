/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesMetricsResponse } from '../../../../common/types/api';
import { Operations } from '../../../authorization';
import { createCaseError } from '../../../common/error';
import { constructQueryOptions } from '../../utils';
import { AllCasesAggregationHandler } from '../all_cases_aggregation_handler';
import type { AggregationBuilder, AllCasesBaseHandlerCommonOptions } from '../types';
import { AverageDuration } from './aggregations/avg_duration';

export class MTTR extends AllCasesAggregationHandler {
  constructor(options: AllCasesBaseHandlerCommonOptions) {
    super(
      options,
      new Map<string, AggregationBuilder<CasesMetricsResponse>>([['mttr', new AverageDuration()]])
    );
  }

  public async compute(): Promise<CasesMetricsResponse> {
    const {
      authorization,
      services: { caseService },
      logger,
    } = this.options.clientArgs;

    try {
      const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
        Operations.getCasesMetrics
      );

      const caseQueryOptions = constructQueryOptions({
        from: this.from,
        to: this.to,
        owner: this.owner,
        authorizationFilter,
      });

      const aggregationsResponse = await caseService.executeAggregations({
        aggregationBuilders: this.aggregationBuilders,
        options: { filter: caseQueryOptions.filter },
      });

      return this.formatResponse<CasesMetricsResponse>(aggregationsResponse);
    } catch (error) {
      throw createCaseError({
        message: `Failed to calculate average mttr: ${error}`,
        error,
        logger,
      });
    }
  }
}

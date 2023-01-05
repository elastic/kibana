/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { SingleCaseMetricsResponse } from '../../../../common/api';
import { Operations } from '../../../authorization';
import { createCaseError } from '../../../common/error';
import { SingleCaseAggregationHandler } from '../single_case_aggregation_handler';
import type { AggregationBuilder, SingleCaseBaseHandlerCommonOptions } from '../types';
import { IsolateHostActions } from './aggregations/isolate_host';

export class Actions extends SingleCaseAggregationHandler {
  constructor(options: SingleCaseBaseHandlerCommonOptions) {
    super(
      options,
      new Map<string, AggregationBuilder<SingleCaseMetricsResponse>>([
        ['actions.isolateHost', new IsolateHostActions()],
      ])
    );
  }

  public async compute(): Promise<SingleCaseMetricsResponse> {
    const {
      unsecuredSavedObjectsClient,
      authorization,
      services: { attachmentService },
      logger,
    } = this.options.clientArgs;
    const { casesClient } = this.options;

    try {
      // This will perform an authorization check to ensure the user has access to the parent case
      const theCase = await casesClient.cases.get({
        id: this.caseId,
        includeComments: false,
      });

      const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
        Operations.getAttachmentMetrics
      );

      const aggregations = this.aggregationBuilders.reduce((aggs, aggregator) => {
        return { ...aggs, ...aggregator.build() };
      }, {});

      const response = await attachmentService.executeCaseActionsAggregations({
        unsecuredSavedObjectsClient,
        caseId: theCase.id,
        filter: authorizationFilter,
        aggregations,
      });

      return this.aggregationBuilders.reduce<SingleCaseMetricsResponse>(
        (acc, aggregator) => merge(acc, aggregator.formatResponse(response)),
        {}
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to compute actions attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}

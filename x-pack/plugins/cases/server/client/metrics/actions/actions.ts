/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { CaseMetricsResponse } from '../../../../common/api';
import { Operations } from '../../../authorization';
import { createCaseError } from '../../../common/error';
import { CasesClient } from '../../client';
import { CasesClientArgs } from '../../types';
import { AggregationBuilder, MetricsHandler } from '../types';
import { IsolateHostActions } from './aggregations/isolate_host';

export class Actions implements MetricsHandler {
  private aggregators: AggregationBuilder[] = [];
  private readonly featureAggregations = new Map<string, AggregationBuilder>([
    ['actions.isolateHost', new IsolateHostActions()],
  ]);

  constructor(
    private readonly caseId: string,
    private readonly casesClient: CasesClient,
    private readonly clientArgs: CasesClientArgs
  ) {}

  public getFeatures(): Set<string> {
    return new Set(this.featureAggregations.keys());
  }

  public setupFeature(feature: string) {
    const aggregation = this.featureAggregations.get(feature);
    if (aggregation) {
      this.aggregators.push(aggregation);
    }
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { unsecuredSavedObjectsClient, authorization, attachmentService, logger } =
      this.clientArgs;

    try {
      // This will perform an authorization check to ensure the user has access to the parent case
      const theCase = await this.casesClient.cases.get({
        id: this.caseId,
        includeComments: false,
        includeSubCaseComments: false,
      });

      const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
        Operations.getAttachmentMetrics
      );

      const aggregations = this.aggregators.reduce((aggs, aggregator) => {
        return { ...aggs, ...aggregator.build() };
      }, {});

      const response = await attachmentService.executeCaseActionsAggregations({
        unsecuredSavedObjectsClient,
        caseId: theCase.id,
        filter: authorizationFilter,
        aggregations,
      });

      return this.aggregators.reduce<CaseMetricsResponse>(
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

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
import { AggregationHandler } from '../aggregation_handler';
import { AggregationBuilder, BaseHandlerCommonOptions } from '../types';
import { IsolateHostActions } from './aggregations/isolate_host';

export class Actions extends AggregationHandler {
  constructor(options: BaseHandlerCommonOptions) {
    super(
      options,
      new Map<string, AggregationBuilder>([['actions.isolateHost', new IsolateHostActions()]])
    );
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { unsecuredSavedObjectsClient, authorization, attachmentService, logger } =
      this.options.clientArgs;
    const { caseId, casesClient } = this.options;

    try {
      // This will perform an authorization check to ensure the user has access to the parent case
      const theCase = await casesClient.cases.get({
        id: caseId,
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

      return this.aggregationBuilders.reduce<CaseMetricsResponse>(
        (acc, aggregator) => merge(acc, aggregator.formatResponse(response)),
        {}
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to compute actions attached case id: ${caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}

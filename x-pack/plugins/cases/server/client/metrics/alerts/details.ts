/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { SingleCaseMetricsResponse } from '../../../../common/api';
import { createCaseError } from '../../../common/error';

import { SingleCaseAggregationHandler } from '../single_case_aggregation_handler';
import {
  AggregationBuilder,
  AggregationResponse,
  SingleCaseBaseHandlerCommonOptions,
} from '../types';
import { AlertHosts, AlertUsers } from './aggregations';

export class AlertDetails extends SingleCaseAggregationHandler {
  constructor(options: SingleCaseBaseHandlerCommonOptions) {
    super(
      options,
      new Map<string, AggregationBuilder<SingleCaseMetricsResponse>>([
        ['alerts.hosts', new AlertHosts()],
        ['alerts.users', new AlertUsers()],
      ])
    );
  }

  public async compute(): Promise<SingleCaseMetricsResponse> {
    const { alertsService, logger } = this.options.clientArgs;
    const { casesClient } = this.options;

    try {
      const alerts = await casesClient.attachments.getAllAlertsAttachToCase({
        caseId: this.caseId,
      });

      if (alerts.length <= 0 || this.aggregationBuilders.length <= 0) {
        return this.formatResponse();
      }

      const aggregationsResponse = await alertsService.executeAggregations({
        aggregationBuilders: this.aggregationBuilders,
        alerts,
      });

      return this.formatResponse(aggregationsResponse);
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts details attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }

  private formatResponse(aggregationsResponse?: AggregationResponse): SingleCaseMetricsResponse {
    return this.aggregationBuilders.reduce(
      (acc, feature) => merge(acc, feature.formatResponse(aggregationsResponse)),
      {}
    );
  }
}

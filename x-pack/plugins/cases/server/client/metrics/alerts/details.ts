/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { CaseMetricsResponse } from '../../../../common/api';
import { createCaseError } from '../../../common/error';

import { AggregationHandler } from '../aggregation_handler';
import { AggregationBuilder, AggregationResponse, BaseHandlerCommonOptions } from '../types';
import { AlertHosts, AlertUsers } from './aggregations';

export class AlertDetails extends AggregationHandler {
  constructor(options: BaseHandlerCommonOptions) {
    super(
      options,
      new Map<string, AggregationBuilder>([
        ['alerts.hosts', new AlertHosts()],
        ['alerts.users', new AlertUsers()],
      ])
    );
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { alertsService, logger } = this.options.clientArgs;
    const { caseId, casesClient } = this.options;

    try {
      const alerts = await casesClient.attachments.getAllAlertsAttachToCase({
        caseId,
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
        message: `Failed to retrieve alerts details attached case id: ${caseId}: ${error}`,
        error,
        logger,
      });
    }
  }

  private formatResponse(aggregationsResponse?: AggregationResponse): CaseMetricsResponse {
    return this.aggregationBuilders.reduce(
      (acc, feature) => merge(acc, feature.formatResponse(aggregationsResponse)),
      {}
    );
  }
}

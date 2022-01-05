/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { CaseMetricsResponse } from '../../../../common/api';
import { createCaseError } from '../../../common/error';

import { CasesClient } from '../../client';
import { CasesClientArgs } from '../../types';
import { MetricsHandler, AggregationBuilder, AggregationResponse } from '../types';
import { AlertHosts, AlertUsers } from './aggregations';

export class AlertDetails implements MetricsHandler {
  private aggregationsToBuild: AggregationBuilder[] = [];
  private readonly aggregations = new Map<string, AggregationBuilder>([
    ['alerts.hosts', new AlertHosts()],
    ['alerts.users', new AlertUsers()],
  ]);

  constructor(
    private readonly caseId: string,
    private readonly casesClient: CasesClient,
    private readonly clientArgs: CasesClientArgs
  ) {}

  public getFeatures(): Set<string> {
    return new Set(this.aggregations.keys());
  }

  public setupFeature(feature: string) {
    const aggregation = this.aggregations.get(feature);
    if (aggregation) {
      this.aggregationsToBuild.push(aggregation);
    }
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { alertsService, logger } = this.clientArgs;

    try {
      const alerts = await this.casesClient.attachments.getAllAlertsAttachToCase({
        caseId: this.caseId,
      });

      if (alerts.length <= 0 || this.aggregationsToBuild.length <= 0) {
        return this.formatResponse();
      }

      const aggregationsResponse = await alertsService.executeAggregations({
        aggregationBuilders: this.aggregationsToBuild,
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

  private formatResponse(aggregationsResponse?: AggregationResponse): CaseMetricsResponse {
    return this.aggregationsToBuild.reduce(
      (acc, feature) => merge(acc, feature.formatResponse(aggregationsResponse)),
      {}
    );
  }
}

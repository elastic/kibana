/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { AlertHostsMetrics, AlertUsersMetrics, CaseMetricsResponse } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { AggregationFields, FrequencyResult, UniqueCountResult } from '../../services/alerts/types';
import { CasesClient } from '../client';
import { CasesClientArgs } from '../types';
import { MetricsHandler } from './types';

export class AlertDetails implements MetricsHandler {
  private requestedFeatures: Set<AggregationFields> = new Set();

  constructor(
    private readonly caseId: string,
    private readonly casesClient: CasesClient,
    private readonly clientArgs: CasesClientArgs
  ) {}

  public getFeatures(): Set<string> {
    return new Set(['alerts.hosts', 'alerts.users']);
  }

  public setupFeature(feature: string) {
    switch (feature) {
      case 'alertHosts':
        this.requestedFeatures.add(AggregationFields.Hosts);
        break;
      case 'alertUsers':
        this.requestedFeatures.add(AggregationFields.Users);
        break;
    }
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { alertsService, logger } = this.clientArgs;

    try {
      const alerts = await this.casesClient.attachments.getAllAlertsAttachToCase({
        caseId: this.caseId,
      });

      if (alerts.length <= 0 || this.requestedFeatures.size <= 0) {
        return this.formatResponse();
      }

      const requestedFeatures = Array.from(this.requestedFeatures);

      const [frequentValues, counts] = await Promise.all([
        alertsService.getMostFrequentValuesForFields({
          fields: requestedFeatures,
          alerts,
        }),
        alertsService.countUniqueValuesForFields({
          fields: requestedFeatures,
          alerts,
        }),
      ]);

      return this.formatResponse({
        frequentValues,
        counts,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts details attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }

  private formatResponse({
    frequentValues,
    counts,
  }: {
    frequentValues?: FrequencyResult;
    counts?: UniqueCountResult;
  } = {}): AlertMetrics {
    const { hosts: uniqueHosts, users: uniqueUsers } = frequentValues ?? {};
    const { totalHosts, totalUsers } = counts ?? {};

    const mergedMetrics: AlertMetrics = Array.from(this.requestedFeatures).reduce(
      (acc, feature) => {
        switch (feature) {
          case AggregationFields.Hosts:
            const hostFields =
              uniqueHosts && totalHosts
                ? { total: totalHosts, values: uniqueHosts }
                : { total: 0, values: [] };

            return merge(acc, { alerts: { hosts: hostFields } });
          case AggregationFields.Users:
            const userFields =
              uniqueUsers && totalUsers
                ? { total: totalUsers, values: uniqueUsers }
                : { total: 0, values: [] };

            return merge(acc, { alerts: { users: userFields } });
          default:
            return acc;
        }
      },
      {}
    );

    return mergedMetrics;
  }
}

interface AlertMetrics {
  alerts?: {
    hosts?: AlertHostsMetrics;
    users?: AlertUsersMetrics;
  };
}

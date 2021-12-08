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
  private retrievedMetrics: AlertMetrics | undefined;
  private requestedFeatures: AggregationFields[] = [];

  constructor(
    private readonly caseId: string,
    private readonly casesClient: CasesClient,
    private readonly clientArgs: CasesClientArgs
  ) {}

  public getFeatures(): Set<string> {
    return new Set(['alertHosts', 'alertUsers']);
  }

  public setupFeature(feature: string) {
    switch (feature) {
      case 'alertHosts':
        this.requestedFeatures.push(AggregationFields.Hosts);
        break;
      case 'alertUsers':
        this.requestedFeatures.push(AggregationFields.Users);
        break;
    }
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { alertsService, logger } = this.clientArgs;

    try {
      if (this.retrievedMetrics != null) {
        return this.retrievedMetrics;
      }

      const alerts = await this.casesClient.attachments.getAllAlertsAttachToCase({
        caseId: this.caseId,
      });

      if (alerts.length > 0 && this.requestedFeatures.length > 0) {
        const [frequentValues, counts] = await Promise.all([
          alertsService.getMostFrequentValuesForFields({
            fields: this.requestedFeatures,
            alerts,
          }),
          alertsService.countUniqueValuesForFields({
            fields: this.requestedFeatures,
            alerts,
          }),
        ]);

        this.setRetrievedMetrics({
          frequentValues,
          counts,
        });
      } else {
        this.setRetrievedMetrics();
      }

      return {
        ...(this.retrievedMetrics ?? {}),
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts details attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }

  private setRetrievedMetrics({
    frequentValues,
    counts,
  }: {
    frequentValues?: FrequencyResult;
    counts?: UniqueCountResult;
  } = {}) {
    const { hosts: uniqueHosts, users: uniqueUsers } = frequentValues ?? {};
    const { totalHosts, totalUsers } = counts ?? {};

    let mergedMetrics: AlertMetrics = {};
    if (uniqueHosts && totalHosts) {
      mergedMetrics = merge(mergedMetrics, {
        alerts: {
          hosts: { total: totalHosts, values: uniqueHosts },
        },
      });
    }

    if (uniqueUsers && totalUsers) {
      mergedMetrics = merge(mergedMetrics, {
        alerts: {
          users: { total: totalUsers, values: uniqueUsers },
        },
      });
    }

    this.retrievedMetrics = {
      ...mergedMetrics,
    };
  }
}

interface AlertMetrics {
  alerts?: {
    hosts?: AlertHostsMetrics;
    users?: AlertUsersMetrics;
  };
}

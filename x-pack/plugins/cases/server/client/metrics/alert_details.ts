/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertHostsMetrics, AlertUsersMetrics, CaseMetricsResponse } from '../../../common';
import { createCaseError } from '../../common';
import { AggregationFields, HostAggregate, UserAggregate } from '../../services/alerts/types';
import { CasesClient } from '../client';
import { CasesClientArgs } from '../types';
import { MetricsHandler } from './types';

interface AlertMetrics {
  alerts: {
    hosts?: AlertHostsMetrics;
    users?: AlertUsersMetrics;
  };
}

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

      // TODO: do in a promise.all
      const { hosts: uniqueHosts, users: uniqueUsers } = await alertsService.aggregateFields({
        fields: this.requestedFeatures,
        alerts,
      });

      const { totalHosts, totalUsers } = await alertsService.getTotalUniqueFields({
        fields: this.requestedFeatures,
        alerts,
      });

      this.setRetrievedMetrics({ uniqueHosts, uniqueUsers, totalHosts, totalUsers });

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
    uniqueHosts,
    uniqueUsers,
    totalHosts,
    totalUsers,
  }: {
    uniqueHosts?: HostAggregate[];
    uniqueUsers?: UserAggregate[];
    totalHosts?: number;
    totalUsers?: number;
  }) {
    let hosts: AlertHostsMetrics | undefined;
    if (uniqueHosts && totalHosts) {
      hosts = {
        total: totalHosts,
        values: uniqueHosts,
      };
    }

    let users: AlertUsersMetrics | undefined;
    if (uniqueUsers && totalUsers) {
      users = {
        total: totalUsers,
        values: uniqueUsers,
      };
    }

    this.retrievedMetrics = {
      alerts: {
        hosts,
        users,
      },
    };
  }
}

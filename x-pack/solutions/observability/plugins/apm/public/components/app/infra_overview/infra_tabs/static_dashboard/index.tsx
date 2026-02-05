/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { buildPhraseFilter } from '@kbn/es-query';
import type { NotificationsStart } from '@kbn/core/public';
import type { InfrastructureDashboardProps } from './helper';
import { getDashboardPanels, buildInfrastructureFilters } from './helper';
import type { InfrastructureDashboardType } from './dashboards/dashboard_catalog';

export interface InfrastructureDashboardComponentProps {
  dashboardType: InfrastructureDashboardType;
  dataView: DataView;
  serviceName?: string;
  podNames?: string[];
  containerNames?: string[];
  hostNames?: string[];
  timeRange: { from: string; to: string };
  notifications: NotificationsStart;
}

export function InfrastructureDashboard({
  dashboardType,
  dataView,
  serviceName,
  podNames,
  containerNames,
  hostNames,
  timeRange,
  notifications,
}: InfrastructureDashboardComponentProps) {
  const [dashboard, setDashboard] = useState<DashboardApi | undefined>(undefined);

  const dashboardProps: InfrastructureDashboardProps = {
    dashboardType,
    dataView,
    serviceName,
    podNames,
    containerNames,
    hostNames,
    timeRange,
  };

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setTimeRange({ from: timeRange.from, to: timeRange.to });
  }, [dashboard, timeRange.from, timeRange.to]);

  return (
    <DashboardRenderer
      key={dashboardType}
      getCreationOptions={() => getCreationOptions(dashboardProps, notifications)}
      onApiAvailable={setDashboard}
    />
  );
}

async function getCreationOptions(
  dashboardProps: InfrastructureDashboardProps,
  notifications: NotificationsStart
): Promise<DashboardCreationOptions> {
  try {
    const result = await getDashboardPanels(dashboardProps);

    if (!result) {
      throw new Error('Failed parsing dashboard panels.');
    }

    const { panels, references } = result;

    const filters: Filter[] = [];

    if (dashboardProps.serviceName) {
      const serviceNameField = dashboardProps.dataView.getFieldByName('service.name');
      if (serviceNameField) {
        const serviceNameFilter = buildPhraseFilter(
          serviceNameField,
          dashboardProps.serviceName,
          dashboardProps.dataView
        );
        filters.push(serviceNameFilter);
      }
    }

    const infraFilters = buildInfrastructureFilters(dashboardProps);
    filters.push(...infraFilters);

    return {
      getInitialInput: () => ({
        viewMode: 'view',
        filters,
        time_range: dashboardProps.timeRange,
        panels,
        references,
      }),
    };
  } catch (error) {
    notifications.toasts.addDanger({
      title: i18n.translate('xpack.apm.infraOverview.dashboard.loadFailure.toast.title', {
        defaultMessage: 'Error while loading infrastructure dashboard "{dashboardType}".',
        values: { dashboardType: dashboardProps.dashboardType },
      }),
      text: error.message,
    });
    return {
      getInitialInput: () => ({
        viewMode: 'view',
        filters: [],
        time_range: dashboardProps.timeRange,
        panels: [],
      }),
    };
  }
}

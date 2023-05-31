/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { buildExistsFilter, buildPhraseFilter, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { controlGroupInputBuilder } from '@kbn/controls-plugin/public';
import { getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import { NotificationsStart } from '@kbn/core/public';
import { APM_STATIC_DATA_VIEW_ID } from '../../../../../common/data_view_constants';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmDataView } from '../../../../hooks/use_apm_data_view';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';

import { getDashboardPanelMap, MetricsDashboardProps } from './helper';

export function JsonMetricsDashboard(dashboardProps: MetricsDashboardProps) {
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();

  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');

  const {
    core: { notifications },
  } = useApmPluginContext();

  const { dataView } = useApmDataView();

  const { serviceName } = useApmServiceContext();

  useEffect(() => {
    if (!dashboard) return;
    dashboard.updateInput({
      timeRange: { from: rangeFrom, to: rangeTo },
      query: { query: kuery, language: 'kuery' },
    });
  }, [kuery, dashboard, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!dashboard || !dataView) return;

    dashboard.updateInput({
      filters: dataView ? getFilters(serviceName, environment, dataView) : [],
    });
  }, [dataView, serviceName, environment, dashboard]);

  return (
    <DashboardRenderer
      getCreationOptions={() =>
        getCreationOptions(dashboardProps, notifications)
      }
      ref={setDashboard}
    />
  );
}

async function getCreationOptions(
  dashboardProps: MetricsDashboardProps,
  notifications: NotificationsStart
) {
  try {
    const builder = controlGroupInputBuilder;
    const controlGroupInput = getDefaultControlGroupInput();

    await builder.addDataControlFromField(controlGroupInput, {
      dataViewId: APM_STATIC_DATA_VIEW_ID,
      title: 'Node name',
      fieldName: 'service.node.name',
      width: 'medium',
      grow: true,
    });
    const panels = await getDashboardPanelMap(dashboardProps);

    if (!panels) {
      throw new Error('Failed parsing dashboard panels.');
    }

    return {
      useControlGroupIntegration: true,
      initialInput: {
        viewMode: ViewMode.VIEW,
        panels,
        controlGroupInput,
      },
    };
  } catch (error) {
    notifications.toasts.addDanger(
      getLoadFailureToastLabels(dashboardProps, error)
    );
    return {};
  }
}

function getFilters(
  serviceName: string,
  environment: string,
  dataView: DataView
): Filter[] {
  const filters: Filter[] = [];

  const serviceNameField = dataView.getFieldByName('service.name');
  if (serviceNameField) {
    const serviceNameFilter = buildPhraseFilter(
      serviceNameField,
      serviceName,
      dataView
    );
    filters.push(serviceNameFilter);
  }

  const environmentField = dataView.getFieldByName('service.environment');
  if (
    environmentField &&
    environment &&
    environment !== ENVIRONMENT_ALL.value
  ) {
    if (environment === ENVIRONMENT_NOT_DEFINED.value) {
      const envExistsFilter = buildExistsFilter(environmentField, dataView);
      envExistsFilter.meta.negate = true;
      filters.push(envExistsFilter);
    } else {
      const environmentFilter = buildPhraseFilter(
        environmentField,
        serviceName,
        dataView
      );
      filters.push(environmentFilter);
    }
  }

  return filters;
}

function getLoadFailureToastLabels(props: MetricsDashboardProps, error: Error) {
  return {
    title: i18n.translate(
      'xpack.apm.runtimeMetricsJsonDashboards.loadFailure.toast.title',
      {
        defaultMessage:
          'Error while loading dashboard for agent "{agentName}" on runtime "{runtimeName}".',
        values: {
          agentName: props.agentName ?? 'unknown',
          runtimeName: props.runtimeName ?? 'unknown',
        },
      }
    ),
    text: error.message,
  };
}

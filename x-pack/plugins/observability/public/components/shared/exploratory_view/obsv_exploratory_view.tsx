/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary } from '@elastic/eui';
import { ExploratoryViewPage } from './index';
import { ExploratoryViewContextProvider } from './contexts/exploratory_view_config';
import { AppDataType, ReportViewType } from './types';

import {
  CORE_WEB_VITALS_LABEL,
  DEVICE_DISTRIBUTION_LABEL,
  KPI_OVER_TIME_LABEL,
  PERF_DIST_LABEL,
} from './configurations/constants/labels';
import { SELECT_REPORT_TYPE } from './series_editor/series_editor';
import { DataTypes } from './configurations/constants';
import { getRumDistributionConfig } from './configurations/rum/data_distribution_config';
import { getKPITrendsLensConfig } from './configurations/rum/kpi_over_time_config';
import { getCoreWebVitalsConfig } from './configurations/rum/core_web_vitals_config';
import { getSyntheticsKPIConfig } from './configurations/synthetics/kpi_over_time_config';
import { getSyntheticsDistributionConfig } from './configurations/synthetics/data_distribution_config';
import { getMobileKPIDistributionConfig } from './configurations/mobile/distribution_config';
import { getMobileKPIConfig } from './configurations/mobile/kpi_over_time_config';
import { getMobileDeviceDistributionConfig } from './configurations/mobile/device_distribution_config';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { getLogsKPIConfig } from './configurations/infra_logs/kpi_over_time_config';

export const DataTypesLabels = {
  [DataTypes.UX]: i18n.translate('xpack.observability.overview.exploratoryView.uxLabel', {
    defaultMessage: 'User experience (RUM)',
  }),

  [DataTypes.SYNTHETICS]: i18n.translate(
    'xpack.observability.overview.exploratoryView.syntheticsLabel',
    {
      defaultMessage: 'Synthetics monitoring',
    }
  ),

  [DataTypes.METRICS]: i18n.translate('xpack.observability.overview.exploratoryView.metricsLabel', {
    defaultMessage: 'Metrics',
  }),

  [DataTypes.LOGS]: i18n.translate('xpack.observability.overview.exploratoryView.logsLabel', {
    defaultMessage: 'Logs',
  }),

  [DataTypes.MOBILE]: i18n.translate(
    'xpack.observability.overview.exploratoryView.mobileExperienceLabel',
    {
      defaultMessage: 'Mobile experience',
    }
  ),
};
export const dataTypes: Array<{ id: AppDataType; label: string }> = [
  {
    id: DataTypes.SYNTHETICS,
    label: DataTypesLabels[DataTypes.SYNTHETICS],
  },
  {
    id: DataTypes.UX,
    label: DataTypesLabels[DataTypes.UX],
  },
  {
    id: DataTypes.LOGS,
    label: DataTypesLabels[DataTypes.LOGS],
  },
  {
    id: DataTypes.MOBILE,
    label: DataTypesLabels[DataTypes.MOBILE],
  },
];

export const reportTypesList: Array<{
  reportType: ReportViewType | typeof SELECT_REPORT_TYPE;
  label: string;
}> = [
  { reportType: 'kpi-over-time', label: KPI_OVER_TIME_LABEL },
  { reportType: 'data-distribution', label: PERF_DIST_LABEL },
  { reportType: 'core-web-vitals', label: CORE_WEB_VITALS_LABEL },
  { reportType: 'device-data-distribution', label: DEVICE_DISTRIBUTION_LABEL },
];

export const obsvReportConfigMap = {
  [DataTypes.UX]: [getKPITrendsLensConfig, getRumDistributionConfig, getCoreWebVitalsConfig],
  [DataTypes.SYNTHETICS]: [getSyntheticsKPIConfig, getSyntheticsDistributionConfig],
  [DataTypes.MOBILE]: [
    getMobileKPIConfig,
    getMobileKPIDistributionConfig,
    getMobileDeviceDistributionConfig,
  ],
  [DataTypes.LOGS]: [getLogsKPIConfig],
};

export function ObservabilityExploratoryView() {
  const { appMountParameters } = usePluginContext();
  return (
    <EuiErrorBoundary>
      <ExploratoryViewContextProvider
        reportTypes={reportTypesList}
        dataTypes={dataTypes}
        dataViews={{}}
        reportConfigMap={obsvReportConfigMap}
        setHeaderActionMenu={appMountParameters.setHeaderActionMenu}
        theme$={appMountParameters.theme$}
      >
        <ExploratoryViewPage />
      </ExploratoryViewContextProvider>
    </EuiErrorBoundary>
  );
}

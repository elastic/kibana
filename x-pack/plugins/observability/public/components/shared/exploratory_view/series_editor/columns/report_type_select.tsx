/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { ReportViewType } from '../../types';
import {
  CORE_WEB_VITALS_LABEL,
  DEVICE_DISTRIBUTION_LABEL,
  KPI_OVER_TIME_LABEL,
  PERF_DIST_LABEL,
} from '../../configurations/constants/labels';

const SELECT_REPORT_TYPE = 'SELECT_REPORT_TYPE';

export const reportTypesList: Array<{
  reportType: ReportViewType | typeof SELECT_REPORT_TYPE;
  label: string;
}> = [
  {
    reportType: SELECT_REPORT_TYPE,
    label: i18n.translate('xpack.observability.expView.reportType.selectLabel', {
      defaultMessage: 'Select report type',
    }),
  },
  { reportType: 'kpi-over-time', label: KPI_OVER_TIME_LABEL },
  { reportType: 'data-distribution', label: PERF_DIST_LABEL },
  { reportType: 'core-web-vitals', label: CORE_WEB_VITALS_LABEL },
  { reportType: 'device-data-distribution', label: DEVICE_DISTRIBUTION_LABEL },
];

export function ReportTypesSelect() {
  const { setReportType, reportType: selectedReportType, allSeries } = useSeriesStorage();

  const onReportTypeChange = (reportType: ReportViewType) => {
    setReportType(reportType);
  };

  const options = reportTypesList
    .filter(({ reportType }) => (selectedReportType ? reportType !== SELECT_REPORT_TYPE : true))
    .map(({ reportType, label }) => ({
      value: reportType,
      inputDisplay: reportType === SELECT_REPORT_TYPE ? label : <strong>{label}</strong>,
      dropdownDisplay: label,
    }));

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={selectedReportType ?? SELECT_REPORT_TYPE}
      onChange={(value) => onReportTypeChange(value as ReportViewType)}
      style={{ minWidth: 200 }}
      isInvalid={!selectedReportType && allSeries.length > 0}
      disabled={allSeries.length > 0}
    />
  );
}

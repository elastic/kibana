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

import { useExploratoryView } from '../../contexts/exploratory_view_config';

const SELECT_REPORT_TYPE = 'SELECT_REPORT_TYPE';

interface Props {
  prepend: string;
}

const SELECT_REPORT = {
  reportType: SELECT_REPORT_TYPE,
  label: i18n.translate('xpack.observability.expView.reportType.selectLabel', {
    defaultMessage: 'Select report type',
  }),
};

export function ReportTypesSelect({ prepend }: Props) {
  const { setReportType, reportType: selectedReportType, allSeries } = useSeriesStorage();

  const { reportTypes } = useExploratoryView();

  const onReportTypeChange = (reportType: ReportViewType) => {
    setReportType(reportType);
  };

  const options = [SELECT_REPORT, ...reportTypes]
    .filter(({ reportType }) => (selectedReportType ? reportType !== SELECT_REPORT_TYPE : true))
    .map(({ reportType, label }) => ({
      value: reportType,
      inputDisplay: reportType === SELECT_REPORT_TYPE ? label : <strong>{label}</strong>,
      dropdownDisplay: label,
    }));

  return (
    <EuiSuperSelect
      aria-labelledby="report-type-label"
      options={options}
      valueOfSelected={selectedReportType ?? SELECT_REPORT_TYPE}
      onChange={(value) => onReportTypeChange(value as ReportViewType)}
      style={{ minWidth: 200 }}
      isInvalid={!selectedReportType && allSeries.length > 0}
      disabled={allSeries.length > 0}
      prepend={prepend}
    />
  );
}

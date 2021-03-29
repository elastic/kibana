/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ReportViewTypeId, SeriesUrl } from '../../types';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_strorage';

interface Props {
  reportTypes: Array<{ id: ReportViewTypeId; label: string }>;
}

export function ReportTypesCol({ reportTypes }: Props) {
  const {
    series: { reportType: selectedReportType, ...restSeries },
    setSeries,
  } = useUrlStorage(NEW_SERIES_KEY);

  return reportTypes?.length > 0 ? (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {reportTypes.map(({ id: reportType, label }) => (
        <EuiFlexItem key={reportType}>
          <EuiButton
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedReportType === reportType ? 'primary' : 'text'}
            fill={selectedReportType === reportType}
            onClick={() => {
              if (reportType === selectedReportType) {
                setSeries(NEW_SERIES_KEY, {
                  dataType: restSeries.dataType,
                } as SeriesUrl);
              } else {
                setSeries(NEW_SERIES_KEY, {
                  ...restSeries,
                  reportType,
                  reportDefinitions: {},
                });
              }
            }}
          >
            {label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : (
    <EuiText color="subdued">{SELECTED_DATA_TYPE_FOR_REPORT}</EuiText>
  );
}

export const SELECTED_DATA_TYPE_FOR_REPORT = i18n.translate(
  'xpack.observability.expView.reportType.noDataType',
  { defaultMessage: 'Select a data type to start building a series.' }
);

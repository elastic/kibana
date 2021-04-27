/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { ReportViewTypeId, SeriesUrl } from '../../types';
import { useUrlStorage } from '../../hooks/use_url_storage';
import { DEFAULT_TIME } from '../../configurations/constants';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';

interface Props {
  seriesId: string;
  reportTypes: Array<{ id: ReportViewTypeId; label: string }>;
}

export function ReportTypesCol({ seriesId, reportTypes }: Props) {
  const {
    series: { reportType: selectedReportType, ...restSeries },
    setSeries,
  } = useUrlStorage(seriesId);

  const { loading, hasData, selectedApp } = useAppIndexPatternContext();

  if (!loading && !hasData && selectedApp) {
    return (
      <FormattedMessage
        id="xpack.observability.reportTypeCol.nodata"
        defaultMessage="No data available"
      />
    );
  }

  return reportTypes?.length > 0 ? (
    <FlexGroup direction="column" gutterSize="xs">
      {reportTypes.map(({ id: reportType, label }) => (
        <EuiFlexItem key={reportType}>
          <EuiButton
            fullWidth
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedReportType === reportType ? 'primary' : 'text'}
            fill={selectedReportType === reportType}
            isDisabled={loading}
            onClick={() => {
              if (reportType === selectedReportType) {
                setSeries(seriesId, {
                  dataType: restSeries.dataType,
                  time: DEFAULT_TIME,
                } as SeriesUrl);
              } else {
                setSeries(seriesId, {
                  ...restSeries,
                  reportType,
                  operationType: undefined,
                  reportDefinitions: {},
                  time: restSeries?.time ?? DEFAULT_TIME,
                });
              }
            }}
          >
            {label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </FlexGroup>
  ) : (
    <EuiText color="subdued">{SELECTED_DATA_TYPE_FOR_REPORT}</EuiText>
  );
}

export const SELECTED_DATA_TYPE_FOR_REPORT = i18n.translate(
  'xpack.observability.expView.reportType.noDataType',
  { defaultMessage: 'No data type selected.' }
);

const FlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

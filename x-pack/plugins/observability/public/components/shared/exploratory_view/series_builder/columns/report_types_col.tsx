/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { map } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { ReportViewType, SeriesUrl } from '../../types';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { DEFAULT_TIME } from '../../configurations/constants';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { ReportTypeItem } from '../series_builder';

interface Props {
  seriesId: string;
  reportTypes: ReportTypeItem[];
}

export function ReportTypesCol({ seriesId, reportTypes }: Props) {
  const { setSeries, getSeries, firstSeries, firstSeriesId } = useSeriesStorage();

  const { reportType: selectedReportType, ...restSeries } = getSeries(seriesId);

  const { loading, hasData } = useAppIndexPatternContext(restSeries.dataType);

  if (!restSeries.dataType) {
    return (
      <FormattedMessage
        id="xpack.observability.expView.seriesBuilder.selectDataType"
        defaultMessage="No data type selected"
      />
    );
  }

  if (!loading && !hasData) {
    return (
      <FormattedMessage
        id="xpack.observability.reportTypeCol.nodata"
        defaultMessage="No data available"
      />
    );
  }

  const disabledReportTypes: ReportViewType[] = map(
    reportTypes.filter(
      ({ reportType }) => firstSeriesId !== seriesId && reportType !== firstSeries.reportType
    ),
    'reportType'
  );

  return reportTypes?.length > 0 ? (
    <FlexGroup direction="column" gutterSize="xs">
      {reportTypes.map(({ reportType, label }) => (
        <EuiFlexItem key={reportType}>
          <Button
            fullWidth
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedReportType === reportType ? 'primary' : 'text'}
            fill={selectedReportType === reportType}
            isDisabled={loading || disabledReportTypes.includes(reportType)}
            onClick={() => {
              if (reportType === selectedReportType) {
                setSeries(seriesId, {
                  dataType: restSeries.dataType,
                  time: DEFAULT_TIME,
                  isNew: true,
                } as SeriesUrl);
              } else {
                setSeries(seriesId, {
                  ...restSeries,
                  reportType,
                  selectedMetricField: undefined,
                  breakdown: undefined,
                  time: restSeries?.time ?? DEFAULT_TIME,
                });
              }
            }}
          >
            {label}
          </Button>
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

const Button = styled(EuiButton)`
  will-change: transform;
`;

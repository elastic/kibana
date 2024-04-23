/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import { useUrlParams } from '../../../hooks';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorFailedTests = ({
  time,
  allowBrushing = true,
}: {
  time: { to: string; from: string };
  allowBrushing?: boolean;
}) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();

  const { errorStateId } = useParams<{ errorStateId: string }>();

  const [, updateUrl] = useUrlParams();

  if (!queryIdFilter && !errorStateId) {
    return null;
  }

  return (
    <>
      <ExploratoryViewEmbeddable
        id={'failedTestsLineSeries'}
        customHeight={'120px'}
        reportType="heatmap"
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={false}
        attributes={[
          {
            time,
            reportDefinitions: {
              ...queryIdFilter,
              ...(errorStateId ? { 'state.id': [errorStateId] } : {}),
            },
            filters: locationFilter,
            dataType: 'synthetics',
            selectedMetricField: 'failed_tests',
            name: FAILED_TESTS_LABEL,
          },
        ]}
        onBrushEnd={({ range }) => {
          if (allowBrushing) {
            updateUrl({
              dateRangeStart: moment(range[0]).toISOString(),
              dateRangeEnd: moment(range[1]).toISOString(),
            });
          }
        }}
      />
      <EuiFlexGroup>
        <EuiFlexItem grow style={{ marginLeft: 10 }}>
          <EuiHealth color="danger">{FAILED_TESTS_LABEL}</EuiHealth>
        </EuiFlexItem>
        {allowBrushing && (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {BRUSH_LABEL}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};

export const FAILED_TESTS_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.failedTests',
  {
    defaultMessage: 'Failed tests',
  }
);

export const BRUSH_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.brushArea', {
  defaultMessage: 'Brush an area for higher fidelity',
});

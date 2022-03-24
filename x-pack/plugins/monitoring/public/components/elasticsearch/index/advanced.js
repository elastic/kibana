/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { IndexDetailStatus } from '../index_detail_status';
import { MonitoringTimeseriesContainer } from '../../chart';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertsCallout } from '../../../alerts/callout';

export const AdvancedIndex = ({ indexSummary, metrics, alerts, ...props }) => {
  const metricsToShow = [
    metrics.index_3,
    metrics.index_4,
    metrics.index_total,
    metrics.index_time,
    metrics.index_refresh,
    metrics.index_throttling,
    metrics.index_disk,
    metrics.index_segment_count,
    metrics.index_latency,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.index.advanced.heading"
              defaultMessage="Elasticsearch index advanced view"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <IndexDetailStatus stats={indexSummary} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <AlertsCallout alerts={alerts} />
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiFlexGrid columns={2} gutterSize="s">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...props} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

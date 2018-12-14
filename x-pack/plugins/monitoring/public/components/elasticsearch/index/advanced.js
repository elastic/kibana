/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { IndexDetailStatus } from '../index_detail_status';
import { MonitoringTimeseriesContainer } from '../../chart';

export const AdvancedIndex = ({
  indexSummary,
  metrics,
  ...props
}) => {
  const metricsToShow = [
    metrics.index_1,
    metrics.index_2,
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
        <EuiPageContent>
          <IndexDetailStatus stats={indexSummary} />
          <EuiSpacer size="m"/>
          <EuiFlexGrid columns={2} gutterSize="none">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index} style={{ width: '50%' }}>
                <MonitoringTimeseriesContainer
                  series={metric}
                  {...props}
                />
                <EuiSpacer size="m"/>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

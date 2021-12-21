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
} from '@elastic/eui';
import { IndexDetailStatus } from '../index_detail_status';
import { MonitoringTimeseriesContainer } from '../../chart';
import { ShardAllocation } from '../shard_allocation/shard_allocation';
import { Logs } from '../../logs';
import { AlertsCallout } from '../../../alerts/callout';

export const Index = ({
  indexSummary,
  metrics,
  clusterUuid,
  indexUuid,
  logs,
  alerts,
  ...props
}) => {
  const metricsToShow = [
    metrics.index_size,
    metrics.index_search_request_rate,
    metrics.index_request_rate,
    metrics.index_segment_count,
    metrics.index_document_count,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
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
          <EuiSpacer size="m" />
          <EuiPanel>
            <Logs logs={logs} indexUuid={indexUuid} clusterUuid={clusterUuid} />
          </EuiPanel>
          <EuiSpacer size="m" />
          <ShardAllocation {...props} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

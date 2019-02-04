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
import { ShardAllocation } from '../shard_allocation/shard_allocation';

export const Index = ({
  scope,
  indexSummary,
  metrics,
  kbnUrl,
  ...props
}) => {
  const metricsToShow = [
    metrics.index_mem,
    metrics.index_size,
    metrics.index_search_request_rate,
    metrics.index_request_rate,
    metrics.index_segment_count,
    metrics.index_document_count,
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
          <EuiSpacer size="m"/>
          <ShardAllocation scope={scope} kbnUrl={kbnUrl} type="index" />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

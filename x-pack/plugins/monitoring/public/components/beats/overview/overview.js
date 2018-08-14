/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LatestActive } from './latest_active';
import { LatestVersions } from './latest_versions';
import { LatestTypes } from './latest_types';
import { Stats } from '../';
import { MonitoringTimeseriesContainer } from '../../chart';
import {
  EuiCallOut,
  EuiTitle,
  EuiSpacer,
  EuiPage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPanel
} from '@elastic/eui';

function renderLatestActive(latestActive, latestTypes, latestVersions) {
  if (latestTypes && latestTypes.length > 0) {
    return (
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s"><h3>Active Beats in Last Day</h3></EuiTitle>
            <EuiSpacer size="s"/>
            <LatestActive latestActive={latestActive} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s"><h3>Top 5 Beat Types in Last Day</h3></EuiTitle>
            <EuiSpacer size="s"/>
            <LatestTypes latestTypes={latestTypes} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s"><h3>Top 5 Versions in Last Day</h3></EuiTitle>
            <EuiSpacer size="s"/>
            <LatestVersions latestVersions={latestVersions} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const calloutMsg = `Hi there! This area is where your latest Beats activity would show
up, but you don't seem to have any activity within the last day.`;

  return (
    <EuiCallOut
      title={calloutMsg}
      iconType="gear"
      data-test-subj="noRecentActivityMessage"
    />
  );
}

export function BeatsOverview({
  latestActive,
  latestTypes,
  latestVersions,
  stats,
  metrics,
  ...props
}) {
  const seriesToShow = [
    metrics.beat_event_rates,
    metrics.beat_fail_rates,
    metrics.beat_throughput_rates,
    metrics.beat_output_errors,
  ];

  const charts = seriesToShow.map((data, index) => (
    <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
      <EuiPanel>
        <MonitoringTimeseriesContainer
          series={data}
          {...props}
        />
      </EuiPanel>
    </EuiFlexItem>
  ));

  return (
    <EuiPage style={{ backgroundColor: 'white' }}>
      <EuiPageBody>
        {renderLatestActive(latestActive, latestTypes, latestVersions)}
        <EuiSpacer size="s"/>
        <Stats stats={stats} />
        <EuiSpacer size="s"/>
        <EuiFlexGroup wrap>
          {charts}
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}

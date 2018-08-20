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
import { MonitoringTimeseriesContainer } from 'plugins/monitoring/components';
import { EuiCallOut } from '@elastic/eui';

function renderLatestActive(latestActive, latestTypes, latestVersions) {
  if (latestTypes && latestTypes.length > 0) {
    return (
      <div className="page-row">
        <div className="row">
          <div className="col-md-4">
            <h2 className="euiTitle">Active Beats in Last Day</h2>
            <LatestActive latestActive={latestActive} />
          </div>

          <div className="col-md-4">
            <h2 className="euiTitle">Top 5 Beat Types in Last Day</h2>
            <LatestTypes latestTypes={latestTypes} />
          </div>

          <div className="col-md-4">
            <h2 className="euiTitle">Top 5 Versions in Last Day</h2>
            <LatestVersions latestVersions={latestVersions} />
          </div>
        </div>
      </div>
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
  return (
    <div>
      {renderLatestActive(latestActive, latestTypes, latestVersions)}

      <Stats stats={stats} />

      <div className="page-row">
        <div className="row">
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.beat_event_rates}
              {...props}
            />
          </div>
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.beat_fail_rates}
              {...props}
            />
          </div>
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.beat_throughput_rates}
              {...props}
            />
          </div>
          <div className="col-md-6">
            <MonitoringTimeseriesContainer
              series={metrics.beat_output_errors}
              {...props}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


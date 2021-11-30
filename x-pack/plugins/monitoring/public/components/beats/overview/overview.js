/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiPanel,
  EuiPageContent,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

function renderLatestActive(latestActive, latestTypes, latestVersions) {
  if (latestTypes && latestTypes.length > 0) {
    return (
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.beats.overview.activeBeatsInLastDayTitle"
                defaultMessage="Active Beats in last day"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <LatestActive latestActive={latestActive} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.beats.overview.top5BeatTypesInLastDayTitle"
                defaultMessage="Top 5 Beat Types in last day"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <LatestTypes latestTypes={latestTypes} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.beats.overview.top5VersionsInLastDayTitle"
                defaultMessage="Top 5 Versions in last day"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <LatestVersions latestVersions={latestVersions} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const calloutMsg = i18n.translate('xpack.monitoring.beats.overview.noActivityDescription', {
    defaultMessage:
      'Hi there! This area is where your latest Beats activity would show up, ' +
      `but you don't seem to have any activity within the last day.`,
  });

  return <EuiCallOut title={calloutMsg} iconType="gear" data-test-subj="noRecentActivityMessage" />;
}

export function BeatsOverview({
  latestActive,
  latestTypes,
  latestVersions,
  stats,
  metrics,
  alerts,
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
        <MonitoringTimeseriesContainer series={data} {...props} />
      </EuiPanel>
    </EuiFlexItem>
  ));

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.beats.overview.heading"
              defaultMessage="Beats Overview"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <Stats stats={stats} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>{renderLatestActive(latestActive, latestTypes, latestVersions)}</EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiFlexGroup wrap>{charts}</EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

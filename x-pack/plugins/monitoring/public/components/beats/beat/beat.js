/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitoringTimeseriesContainer } from '../../chart';
import { formatMetric } from '../../../lib/format_number';
import {
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiFlexGrid,
  EuiSpacer,
  EuiPageContent,
  EuiPanel,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SummaryStatus } from '../../summary_status';
import { FormattedMessage } from '@kbn/i18n-react';

export function Beat({ summary, metrics, ...props }) {
  const metricsToShow = [
    metrics.beat_event_rates,
    metrics.beat_fail_rates,
    metrics.beat_throughput_rates,
    metrics.beat_output_errors,
    metrics.beat_memory,
    metrics.beat_cpu_utilization,
    metrics.beat_os_load,
    metrics.beat_handles,
  ];

  const summarytStatsTop = [
    {
      label: i18n.translate('xpack.monitoring.beats.instance.nameLabel', {
        defaultMessage: 'Name',
      }),
      value: summary.name,
      'data-test-subj': 'name',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.hostLabel', {
        defaultMessage: 'Host',
      }),
      value: summary.transportAddress,
      'data-test-subj': 'host',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.versionLabel', {
        defaultMessage: 'Version',
      }),
      value: summary.version,
      'data-test-subj': 'version',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.typeLabel', {
        defaultMessage: 'Type',
      }),
      value: summary.type,
      'data-test-subj': 'type',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.outputLabel', {
        defaultMessage: 'Output',
      }),
      value: summary.output,
      'data-test-subj': 'output',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.configReloadsLabel', {
        defaultMessage: 'Config reloads',
      }),
      value: formatMetric(summary.configReloads, 'int_commas'),
      'data-test-subj': 'configReloads',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.uptimeLabel', {
        defaultMessage: 'Uptime',
      }),
      value: formatMetric(summary.uptime, 'time_since'),
      'data-test-subj': 'uptime',
    },
  ];

  const summarytStatsBot = [
    {
      label: i18n.translate('xpack.monitoring.beats.instance.eventsTotalLabel', {
        defaultMessage: 'Events total',
      }),
      value: formatMetric(summary.eventsTotal, 'int_commas'),
      'data-test-subj': 'eventsTotal',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.eventsEmittedLabel', {
        defaultMessage: 'Events emitted',
      }),
      value: formatMetric(summary.eventsEmitted, 'int_commas'),
      'data-test-subj': 'eventsEmitted',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.eventsDroppedLabel', {
        defaultMessage: 'Events dropped',
      }),
      value: formatMetric(summary.eventsDropped, 'int_commas'),
      'data-test-subj': 'eventsDropped',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.bytesSentLabel', {
        defaultMessage: 'Bytes sent',
      }),
      value: formatMetric(summary.bytesWritten, 'byte'),
      'data-test-subj': 'bytesWritten',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.handlesLimitSoftLabel', {
        defaultMessage: 'Handles limit (soft)',
      }),
      value: formatMetric(summary.handlesSoftLimit, 'int_commas'),
      'data-test-subj': 'handlesLimitSoft',
    },
    {
      label: i18n.translate('xpack.monitoring.beats.instance.handlesLimitHardLabel', {
        defaultMessage: 'Handles limit (hard)',
      }),
      value: formatMetric(summary.handlesHardLimit, 'int_commas'),
      'data-test-subj': 'handlesLimitHard',
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <SummaryStatus metrics={summarytStatsTop} data-test-subj="beatSummaryStatus01" />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <SummaryStatus metrics={summarytStatsBot} data-test-subj="beatSummaryStatus02" />
        </EuiPanel>
        <EuiPageContent>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage id="xpack.monitoring.beats.beat.heading" defaultMessage="Beat" />
            </h1>
          </EuiScreenReaderOnly>
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
}

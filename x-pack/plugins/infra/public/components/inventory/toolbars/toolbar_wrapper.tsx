/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SnapshotMetricType } from '../../../../common/inventory_models/types';
import { WithSource } from '../../../containers/with_source';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { Toolbar } from '../../eui/toolbar';
import { ToolbarProps } from './toolbar';
import { fieldToName } from '../../waffle/lib/field_to_display_name';

interface Props {
  children: (props: Omit<ToolbarProps, 'accounts' | 'regions'>) => React.ReactElement;
}

export const ToolbarWrapper = (props: Props) => {
  return (
    <Toolbar>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <WithSource>
          {({ createDerivedIndexPattern }) => (
            <WithWaffleOptions>
              {({
                changeMetric,
                changeGroupBy,
                changeCustomOptions,
                changeAccount,
                changeRegion,
                customOptions,
                groupBy,
                metric,
                nodeType,
                accountId,
                region,
              }) =>
                props.children({
                  createDerivedIndexPattern,
                  changeMetric,
                  changeGroupBy,
                  changeAccount,
                  changeRegion,
                  changeCustomOptions,
                  customOptions,
                  groupBy,
                  metric,
                  nodeType,
                  region,
                  accountId,
                })
              }
            </WithWaffleOptions>
          )}
        </WithSource>
      </EuiFlexGroup>
    </Toolbar>
  );
};

const ToolbarTranslations = {
  CPUUsage: i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageText', {
    defaultMessage: 'CPU usage',
  }),

  MemoryUsage: i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageText', {
    defaultMessage: 'Memory usage',
  }),

  InboundTraffic: i18n.translate('xpack.infra.waffle.metricOptions.inboundTrafficText', {
    defaultMessage: 'Inbound traffic',
  }),

  OutboundTraffic: i18n.translate('xpack.infra.waffle.metricOptions.outboundTrafficText', {
    defaultMessage: 'Outbound traffic',
  }),

  LogRate: i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateText', {
    defaultMessage: 'Log rate',
  }),

  Load: i18n.translate('xpack.infra.waffle.metricOptions.loadText', {
    defaultMessage: 'Load',
  }),

  Count: i18n.translate('xpack.infra.waffle.metricOptions.countText', {
    defaultMessage: 'Count',
  }),
  DiskIOReadBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOReadBytes', {
    defaultMessage: 'Disk Reads',
  }),
  DiskIOWriteBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOWriteBytes', {
    defaultMessage: 'Disk Writes',
  }),
  s3BucketSize: i18n.translate('xpack.infra.waffle.metricOptions.s3BucketSize', {
    defaultMessage: 'Bucket Size',
  }),
  s3TotalRequests: i18n.translate('xpack.infra.waffle.metricOptions.s3TotalRequests', {
    defaultMessage: 'Total Requests',
  }),
  s3NumberOfObjects: i18n.translate('xpack.infra.waffle.metricOptions.s3NumberOfObjects', {
    defaultMessage: 'Number of Objects',
  }),
  s3DownloadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3DownloadBytes', {
    defaultMessage: 'Downloads (Bytes)',
  }),
  s3UploadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3UploadBytes', {
    defaultMessage: 'Uploads (Bytes)',
  }),
  rdsConnections: i18n.translate('xpack.infra.waffle.metricOptions.rdsConnections', {
    defaultMessage: 'Connections',
  }),
  rdsQueriesExecuted: i18n.translate('xpack.infra.waffle.metricOptions.rdsQueriesExecuted', {
    defaultMessage: 'Queries Executed',
  }),
  rdsActiveTransactions: i18n.translate('xpack.infra.waffle.metricOptions.rdsActiveTransactions', {
    defaultMessage: 'Active Transactions',
  }),
  rdsLatency: i18n.translate('xpack.infra.waffle.metricOptions.rdsLatency', {
    defaultMessage: 'Latency',
  }),
  sqsMessagesVisible: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesVisible', {
    defaultMessage: 'Messages Available',
  }),
  sqsMessagesDelayed: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesDelayed', {
    defaultMessage: 'Messages Delayed',
  }),
  sqsMessagesSent: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesSent', {
    defaultMessage: 'Messages Added',
  }),
  sqsMessagesEmpty: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesEmpty', {
    defaultMessage: 'Messages Returned Empty',
  }),
  sqsOldestMessage: i18n.translate('xpack.infra.waffle.metricOptions.sqsOldestMessage', {
    defaultMessage: 'Oldest Message',
  }),
};

export const toGroupByOpt = (field: string) => ({
  text: fieldToName(field),
  field,
});

export const toMetricOpt = (
  metric: SnapshotMetricType
): { text: string; value: SnapshotMetricType } => {
  switch (metric) {
    case 'cpu':
      return {
        text: ToolbarTranslations.CPUUsage,
        value: 'cpu',
      };
    case 'memory':
      return {
        text: ToolbarTranslations.MemoryUsage,
        value: 'memory',
      };
    case 'rx':
      return {
        text: ToolbarTranslations.InboundTraffic,
        value: 'rx',
      };
    case 'tx':
      return {
        text: ToolbarTranslations.OutboundTraffic,
        value: 'tx',
      };
    case 'logRate':
      return {
        text: ToolbarTranslations.LogRate,
        value: 'logRate',
      };
    case 'load':
      return {
        text: ToolbarTranslations.Load,
        value: 'load',
      };

    case 'count':
      return {
        text: ToolbarTranslations.Count,
        value: 'count',
      };
    case 'diskIOReadBytes':
      return {
        text: ToolbarTranslations.DiskIOReadBytes,
        value: 'diskIOReadBytes',
      };
    case 'diskIOWriteBytes':
      return {
        text: ToolbarTranslations.DiskIOWriteBytes,
        value: 'diskIOWriteBytes',
      };
    case 's3BucketSize':
      return {
        text: ToolbarTranslations.s3BucketSize,
        value: 's3BucketSize',
      };
    case 's3TotalRequests':
      return {
        text: ToolbarTranslations.s3TotalRequests,
        value: 's3TotalRequests',
      };
    case 's3NumberOfObjects':
      return {
        text: ToolbarTranslations.s3NumberOfObjects,
        value: 's3NumberOfObjects',
      };
    case 's3DownloadBytes':
      return {
        text: ToolbarTranslations.s3DownloadBytes,
        value: 's3DownloadBytes',
      };
    case 's3UploadBytes':
      return {
        text: ToolbarTranslations.s3UploadBytes,
        value: 's3UploadBytes',
      };
    case 'rdsConnections':
      return {
        text: ToolbarTranslations.rdsConnections,
        value: 'rdsConnections',
      };
    case 'rdsQueriesExecuted':
      return {
        text: ToolbarTranslations.rdsQueriesExecuted,
        value: 'rdsQueriesExecuted',
      };
    case 'rdsActiveTransactions':
      return {
        text: ToolbarTranslations.rdsActiveTransactions,
        value: 'rdsActiveTransactions',
      };
    case 'rdsLatency':
      return {
        text: ToolbarTranslations.rdsLatency,
        value: 'rdsLatency',
      };
    case 'sqsMessagesVisible':
      return {
        text: ToolbarTranslations.sqsMessagesVisible,
        value: 'sqsMessagesVisible',
      };
    case 'sqsMessagesDelayed':
      return {
        text: ToolbarTranslations.sqsMessagesDelayed,
        value: 'sqsMessagesDelayed',
      };
    case 'sqsMessagesSent':
      return {
        text: ToolbarTranslations.sqsMessagesSent,
        value: 'sqsMessagesSent',
      };
    case 'sqsMessagesEmpty':
      return {
        text: ToolbarTranslations.sqsMessagesEmpty,
        value: 'sqsMessagesEmpty',
      };
    case 'sqsOldestMessage':
      return {
        text: ToolbarTranslations.sqsOldestMessage,
        value: 'sqsOldestMessage',
      };
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { SnapshotMetricType } from './inventory_models/types';

const Translations = {
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

export const toMetricOpt = (
  metric: SnapshotMetricType
): { text: string; value: SnapshotMetricType } | undefined => {
  switch (metric) {
    case 'cpu':
      return {
        text: Translations.CPUUsage,
        value: 'cpu',
      };
    case 'memory':
      return {
        text: Translations.MemoryUsage,
        value: 'memory',
      };
    case 'rx':
      return {
        text: Translations.InboundTraffic,
        value: 'rx',
      };
    case 'tx':
      return {
        text: Translations.OutboundTraffic,
        value: 'tx',
      };
    case 'logRate':
      return {
        text: Translations.LogRate,
        value: 'logRate',
      };
    case 'load':
      return {
        text: Translations.Load,
        value: 'load',
      };

    case 'count':
      return {
        text: Translations.Count,
        value: 'count',
      };
    case 'diskIOReadBytes':
      return {
        text: Translations.DiskIOReadBytes,
        value: 'diskIOReadBytes',
      };
    case 'diskIOWriteBytes':
      return {
        text: Translations.DiskIOWriteBytes,
        value: 'diskIOWriteBytes',
      };
    case 's3BucketSize':
      return {
        text: Translations.s3BucketSize,
        value: 's3BucketSize',
      };
    case 's3TotalRequests':
      return {
        text: Translations.s3TotalRequests,
        value: 's3TotalRequests',
      };
    case 's3NumberOfObjects':
      return {
        text: Translations.s3NumberOfObjects,
        value: 's3NumberOfObjects',
      };
    case 's3DownloadBytes':
      return {
        text: Translations.s3DownloadBytes,
        value: 's3DownloadBytes',
      };
    case 's3UploadBytes':
      return {
        text: Translations.s3UploadBytes,
        value: 's3UploadBytes',
      };
    case 'rdsConnections':
      return {
        text: Translations.rdsConnections,
        value: 'rdsConnections',
      };
    case 'rdsQueriesExecuted':
      return {
        text: Translations.rdsQueriesExecuted,
        value: 'rdsQueriesExecuted',
      };
    case 'rdsActiveTransactions':
      return {
        text: Translations.rdsActiveTransactions,
        value: 'rdsActiveTransactions',
      };
    case 'rdsLatency':
      return {
        text: Translations.rdsLatency,
        value: 'rdsLatency',
      };
    case 'sqsMessagesVisible':
      return {
        text: Translations.sqsMessagesVisible,
        value: 'sqsMessagesVisible',
      };
    case 'sqsMessagesDelayed':
      return {
        text: Translations.sqsMessagesDelayed,
        value: 'sqsMessagesDelayed',
      };
    case 'sqsMessagesSent':
      return {
        text: Translations.sqsMessagesSent,
        value: 'sqsMessagesSent',
      };
    case 'sqsMessagesEmpty':
      return {
        text: Translations.sqsMessagesEmpty,
        value: 'sqsMessagesEmpty',
      };
    case 'sqsOldestMessage':
      return {
        text: Translations.sqsOldestMessage,
        value: 'sqsOldestMessage',
      };
  }
};

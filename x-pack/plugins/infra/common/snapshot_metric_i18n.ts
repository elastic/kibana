/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { SnapshotMetricType } from './inventory_models/types';

export const Translations = {
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
    defaultMessage: 'Disk reads',
  }),
  DiskIOWriteBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOWriteBytes', {
    defaultMessage: 'Disk writes',
  }),
  s3BucketSize: i18n.translate('xpack.infra.waffle.metricOptions.s3BucketSize', {
    defaultMessage: 'Bucket size',
  }),
  s3TotalRequests: i18n.translate('xpack.infra.waffle.metricOptions.s3TotalRequests', {
    defaultMessage: 'Total requests',
  }),
  s3NumberOfObjects: i18n.translate('xpack.infra.waffle.metricOptions.s3NumberOfObjects', {
    defaultMessage: 'Number of objects',
  }),
  s3DownloadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3DownloadBytes', {
    defaultMessage: 'Downloads (bytes)',
  }),
  s3UploadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3UploadBytes', {
    defaultMessage: 'Uploads (bytes)',
  }),
  rdsConnections: i18n.translate('xpack.infra.waffle.metricOptions.rdsConnections', {
    defaultMessage: 'Connections',
  }),
  rdsQueriesExecuted: i18n.translate('xpack.infra.waffle.metricOptions.rdsQueriesExecuted', {
    defaultMessage: 'Queries executed',
  }),
  rdsActiveTransactions: i18n.translate('xpack.infra.waffle.metricOptions.rdsActiveTransactions', {
    defaultMessage: 'Active transactions',
  }),
  rdsLatency: i18n.translate('xpack.infra.waffle.metricOptions.rdsLatency', {
    defaultMessage: 'Latency',
  }),
  sqsMessagesVisible: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesVisible', {
    defaultMessage: 'Messages available',
  }),
  sqsMessagesDelayed: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesDelayed', {
    defaultMessage: 'Messages delayed',
  }),
  sqsMessagesSent: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesSent', {
    defaultMessage: 'Messages added',
  }),
  sqsMessagesEmpty: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesEmpty', {
    defaultMessage: 'Messages returned empty',
  }),
  sqsOldestMessage: i18n.translate('xpack.infra.waffle.metricOptions.sqsOldestMessage', {
    defaultMessage: 'Oldest message',
  }),
};

// Lowercase versions of all metrics, for when they need to be used in the middle of a sentence;
// these may need to be translated differently depending on language, e.g. still capitalizing "CPU"
const TranslationsLowercase = {
  CPUUsage: i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageTextLowercase', {
    defaultMessage: 'CPU usage',
  }),

  MemoryUsage: i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageTextLowercase', {
    defaultMessage: 'memory usage',
  }),

  InboundTraffic: i18n.translate('xpack.infra.waffle.metricOptions.inboundTrafficTextLowercase', {
    defaultMessage: 'inbound traffic',
  }),

  OutboundTraffic: i18n.translate('xpack.infra.waffle.metricOptions.outboundTrafficTextLowercase', {
    defaultMessage: 'outbound traffic',
  }),

  LogRate: i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateTextLowercase', {
    defaultMessage: 'log rate',
  }),

  Load: i18n.translate('xpack.infra.waffle.metricOptions.loadTextLowercase', {
    defaultMessage: 'load',
  }),

  Count: i18n.translate('xpack.infra.waffle.metricOptions.countTextLowercase', {
    defaultMessage: 'count',
  }),
  DiskIOReadBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOReadBytesLowercase', {
    defaultMessage: 'disk reads',
  }),
  DiskIOWriteBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOWriteBytesLowercase', {
    defaultMessage: 'disk writes',
  }),
  s3BucketSize: i18n.translate('xpack.infra.waffle.metricOptions.s3BucketSizeLowercase', {
    defaultMessage: 'bucket size',
  }),
  s3TotalRequests: i18n.translate('xpack.infra.waffle.metricOptions.s3TotalRequestsLowercase', {
    defaultMessage: 'total requests',
  }),
  s3NumberOfObjects: i18n.translate('xpack.infra.waffle.metricOptions.s3NumberOfObjectsLowercase', {
    defaultMessage: 'number of objects',
  }),
  s3DownloadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3DownloadBytesLowercase', {
    defaultMessage: 'downloads (bytes)',
  }),
  s3UploadBytes: i18n.translate('xpack.infra.waffle.metricOptions.s3UploadBytesLowercase', {
    defaultMessage: 'uploads (bytes)',
  }),
  rdsConnections: i18n.translate('xpack.infra.waffle.metricOptions.rdsConnectionsLowercase', {
    defaultMessage: 'connections',
  }),
  rdsQueriesExecuted: i18n.translate(
    'xpack.infra.waffle.metricOptions.rdsQueriesExecutedLowercase',
    {
      defaultMessage: 'queries executed',
    }
  ),
  rdsActiveTransactions: i18n.translate(
    'xpack.infra.waffle.metricOptions.rdsActiveTransactionsLowercase',
    {
      defaultMessage: 'active transactions',
    }
  ),
  rdsLatency: i18n.translate('xpack.infra.waffle.metricOptions.rdsLatencyLowercase', {
    defaultMessage: 'latency',
  }),
  sqsMessagesVisible: i18n.translate(
    'xpack.infra.waffle.metricOptions.sqsMessagesVisibleLowercase',
    {
      defaultMessage: 'messages available',
    }
  ),
  sqsMessagesDelayed: i18n.translate(
    'xpack.infra.waffle.metricOptions.sqsMessagesDelayedLowercase',
    {
      defaultMessage: 'messages delayed',
    }
  ),
  sqsMessagesSent: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesSentLowercase', {
    defaultMessage: 'messages added',
  }),
  sqsMessagesEmpty: i18n.translate('xpack.infra.waffle.metricOptions.sqsMessagesEmptyLowercase', {
    defaultMessage: 'messages returned empty',
  }),
  sqsOldestMessage: i18n.translate('xpack.infra.waffle.metricOptions.sqsOldestMessageLowercase', {
    defaultMessage: 'oldest Mmessage',
  }),
};

export const toMetricOpt = (
  metric: SnapshotMetricType
): { text: string; textLC: string; value: SnapshotMetricType } | undefined => {
  switch (metric) {
    case 'cpu':
      return {
        text: Translations.CPUUsage,
        textLC: TranslationsLowercase.CPUUsage,
        value: 'cpu',
      };
    case 'memory':
      return {
        text: Translations.MemoryUsage,
        textLC: TranslationsLowercase.MemoryUsage,
        value: 'memory',
      };
    case 'rx':
      return {
        text: Translations.InboundTraffic,
        textLC: TranslationsLowercase.InboundTraffic,
        value: 'rx',
      };
    case 'tx':
      return {
        text: Translations.OutboundTraffic,
        textLC: TranslationsLowercase.OutboundTraffic,
        value: 'tx',
      };
    case 'logRate':
      return {
        text: Translations.LogRate,
        textLC: TranslationsLowercase.LogRate,
        value: 'logRate',
      };
    case 'load':
      return {
        text: Translations.Load,
        textLC: TranslationsLowercase.Load,
        value: 'load',
      };

    case 'count':
      return {
        text: Translations.Count,
        textLC: TranslationsLowercase.Count,
        value: 'count',
      };
    case 'diskIOReadBytes':
      return {
        text: Translations.DiskIOReadBytes,
        textLC: TranslationsLowercase.DiskIOReadBytes,
        value: 'diskIOReadBytes',
      };
    case 'diskIOWriteBytes':
      return {
        text: Translations.DiskIOWriteBytes,
        textLC: TranslationsLowercase.DiskIOWriteBytes,
        value: 'diskIOWriteBytes',
      };
    case 's3BucketSize':
      return {
        text: Translations.s3BucketSize,
        textLC: TranslationsLowercase.s3BucketSize,
        value: 's3BucketSize',
      };
    case 's3TotalRequests':
      return {
        text: Translations.s3TotalRequests,
        textLC: TranslationsLowercase.s3TotalRequests,
        value: 's3TotalRequests',
      };
    case 's3NumberOfObjects':
      return {
        text: Translations.s3NumberOfObjects,
        textLC: TranslationsLowercase.s3NumberOfObjects,
        value: 's3NumberOfObjects',
      };
    case 's3DownloadBytes':
      return {
        text: Translations.s3DownloadBytes,
        textLC: TranslationsLowercase.s3DownloadBytes,
        value: 's3DownloadBytes',
      };
    case 's3UploadBytes':
      return {
        text: Translations.s3UploadBytes,
        textLC: TranslationsLowercase.s3UploadBytes,
        value: 's3UploadBytes',
      };
    case 'rdsConnections':
      return {
        text: Translations.rdsConnections,
        textLC: TranslationsLowercase.rdsConnections,
        value: 'rdsConnections',
      };
    case 'rdsQueriesExecuted':
      return {
        text: Translations.rdsQueriesExecuted,
        textLC: TranslationsLowercase.rdsQueriesExecuted,
        value: 'rdsQueriesExecuted',
      };
    case 'rdsActiveTransactions':
      return {
        text: Translations.rdsActiveTransactions,
        textLC: TranslationsLowercase.rdsActiveTransactions,
        value: 'rdsActiveTransactions',
      };
    case 'rdsLatency':
      return {
        text: Translations.rdsLatency,
        textLC: TranslationsLowercase.rdsLatency,
        value: 'rdsLatency',
      };
    case 'sqsMessagesVisible':
      return {
        text: Translations.sqsMessagesVisible,
        textLC: TranslationsLowercase.sqsMessagesVisible,
        value: 'sqsMessagesVisible',
      };
    case 'sqsMessagesDelayed':
      return {
        text: Translations.sqsMessagesDelayed,
        textLC: TranslationsLowercase.sqsMessagesDelayed,
        value: 'sqsMessagesDelayed',
      };
    case 'sqsMessagesSent':
      return {
        text: Translations.sqsMessagesSent,
        textLC: TranslationsLowercase.sqsMessagesSent,
        value: 'sqsMessagesSent',
      };
    case 'sqsMessagesEmpty':
      return {
        text: Translations.sqsMessagesEmpty,
        textLC: TranslationsLowercase.sqsMessagesEmpty,
        value: 'sqsMessagesEmpty',
      };
    case 'sqsOldestMessage':
      return {
        text: Translations.sqsOldestMessage,
        textLC: TranslationsLowercase.sqsOldestMessage,
        value: 'sqsOldestMessage',
      };
  }
};

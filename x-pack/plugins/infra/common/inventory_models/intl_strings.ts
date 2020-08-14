/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { SnapshotMetricType } from './types';
export const CPUUsage = i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageText', {
  defaultMessage: 'CPU usage',
});

export const MemoryUsage = i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageText', {
  defaultMessage: 'Memory usage',
});

export const InboundTraffic = i18n.translate(
  'xpack.infra.waffle.metricOptions.inboundTrafficText',
  {
    defaultMessage: 'Inbound traffic',
  }
);

export const OutboundTraffic = i18n.translate(
  'xpack.infra.waffle.metricOptions.outboundTrafficText',
  {
    defaultMessage: 'Outbound traffic',
  }
);

export const LogRate = i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateText', {
  defaultMessage: 'Log rate',
});

export const Load = i18n.translate('xpack.infra.waffle.metricOptions.loadText', {
  defaultMessage: 'Load',
});

interface Lookup {
  [id: string]: string;
}

export const fieldToName = (field: string) => {
  const LOOKUP: Lookup = {
    'kubernetes.namespace': i18n.translate('xpack.infra.groupByDisplayNames.kubernetesNamespace', {
      defaultMessage: 'Namespace',
    }),
    'kubernetes.node.name': i18n.translate('xpack.infra.groupByDisplayNames.kubernetesNodeName', {
      defaultMessage: 'Node',
    }),
    'host.name': i18n.translate('xpack.infra.groupByDisplayNames.hostName', {
      defaultMessage: 'Host',
    }),
    'cloud.availability_zone': i18n.translate('xpack.infra.groupByDisplayNames.availabilityZone', {
      defaultMessage: 'Availability zone',
    }),
    'cloud.machine.type': i18n.translate('xpack.infra.groupByDisplayNames.machineType', {
      defaultMessage: 'Machine type',
    }),
    'cloud.project.id': i18n.translate('xpack.infra.groupByDisplayNames.projectID', {
      defaultMessage: 'Project ID',
    }),
    'cloud.provider': i18n.translate('xpack.infra.groupByDisplayNames.provider', {
      defaultMessage: 'Cloud provider',
    }),
    'service.type': i18n.translate('xpack.infra.groupByDisplayNames.serviceType', {
      defaultMessage: 'Service type',
    }),
  };
  return LOOKUP[field] || field;
};

export const SNAPSHOT_METRIC_TRANSLATIONS = {
  cpu: i18n.translate('xpack.infra.waffle.metricOptions.cpuUsageText', {
    defaultMessage: 'CPU usage',
  }),

  memory: i18n.translate('xpack.infra.waffle.metricOptions.memoryUsageText', {
    defaultMessage: 'Memory usage',
  }),

  rx: i18n.translate('xpack.infra.waffle.metricOptions.inboundTrafficText', {
    defaultMessage: 'Inbound traffic',
  }),

  tx: i18n.translate('xpack.infra.waffle.metricOptions.outboundTrafficText', {
    defaultMessage: 'Outbound traffic',
  }),

  logRate: i18n.translate('xpack.infra.waffle.metricOptions.hostLogRateText', {
    defaultMessage: 'Log rate',
  }),

  load: i18n.translate('xpack.infra.waffle.metricOptions.loadText', {
    defaultMessage: 'Load',
  }),

  count: i18n.translate('xpack.infra.waffle.metricOptions.countText', {
    defaultMessage: 'Count',
  }),
  diskIOReadBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOReadBytes', {
    defaultMessage: 'Disk Reads',
  }),
  diskIOWriteBytes: i18n.translate('xpack.infra.waffle.metricOptions.diskIOWriteBytes', {
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
} as Record<SnapshotMetricType, string>;

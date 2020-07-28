/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const ItemTypeRT = rt.keyof({
  host: null,
  pod: null,
  container: null,
  awsEC2: null,
  awsS3: null,
  awsSQS: null,
  awsRDS: null,
});

export const InventoryVisTypeRT = rt.keyof({
  line: null,
  area: null,
  bar: null,
});

export type InventoryVisType = rt.TypeOf<typeof InventoryVisTypeRT>;

export const InventoryFormatterTypeRT = rt.keyof({
  abbreviatedNumber: null,
  bits: null,
  bytes: null,
  number: null,
  percent: null,
  highPercision: null,
});
export type InventoryFormatterType = rt.TypeOf<typeof InventoryFormatterTypeRT>;
export type InventoryItemType = rt.TypeOf<typeof ItemTypeRT>;

export const InventoryMetricRT = rt.keyof({
  hostSystemOverview: null,
  hostCpuUsage: null,
  hostFilesystem: null,
  hostK8sOverview: null,
  hostK8sCpuCap: null,
  hostK8sDiskCap: null,
  hostK8sMemoryCap: null,
  hostK8sPodCap: null,
  hostLoad: null,
  hostMemoryUsage: null,
  hostNetworkTraffic: null,
  hostDockerOverview: null,
  hostDockerInfo: null,
  hostDockerTop5ByCpu: null,
  hostDockerTop5ByMemory: null,
  podOverview: null,
  podCpuUsage: null,
  podMemoryUsage: null,
  podLogUsage: null,
  podNetworkTraffic: null,
  containerOverview: null,
  containerCpuKernel: null,
  containerCpuUsage: null,
  containerDiskIOOps: null,
  containerDiskIOBytes: null,
  containerMemory: null,
  containerNetworkTraffic: null,
  nginxHits: null,
  nginxRequestRate: null,
  nginxActiveConnections: null,
  nginxRequestsPerConnection: null,
  awsOverview: null,
  awsCpuUtilization: null,
  awsNetworkBytes: null,
  awsNetworkPackets: null,
  awsDiskioBytes: null,
  awsDiskioOps: null,
  awsEC2CpuUtilization: null,
  awsEC2NetworkTraffic: null,
  awsEC2DiskIOBytes: null,
  awsS3TotalRequests: null,
  awsS3NumberOfObjects: null,
  awsS3BucketSize: null,
  awsS3DownloadBytes: null,
  awsS3UploadBytes: null,
  awsRDSCpuTotal: null,
  awsRDSConnections: null,
  awsRDSQueriesExecuted: null,
  awsRDSActiveTransactions: null,
  awsRDSLatency: null,
  awsSQSMessagesVisible: null,
  awsSQSMessagesDelayed: null,
  awsSQSMessagesSent: null,
  awsSQSMessagesEmpty: null,
  awsSQSOldestMessage: null,
  custom: null,
});
export type InventoryMetric = rt.TypeOf<typeof InventoryMetricRT>;

export const TSVBMetricTypeRT = rt.keyof({
  avg: null,
  max: null,
  min: null,
  calculation: null,
  cardinality: null,
  series_agg: null,
  positive_only: null,
  derivative: null,
  count: null,
  sum: null,
  cumulative_sum: null,
});

export type TSVBMetricType = rt.TypeOf<typeof TSVBMetricTypeRT>;

export const TSVBMetricModelCountRT = rt.type({
  id: rt.string,
  type: rt.literal('count'),
});

export const TSVBMetricModelBasicMetricRT = rt.intersection([
  rt.type({
    id: rt.string,
    type: TSVBMetricTypeRT,
  }),
  rt.partial({
    field: rt.string,
  }),
]);

export const TSVBMetricModelVariableRT = rt.type({
  field: rt.string,
  id: rt.string,
  name: rt.string,
});

export const TSVBMetricModelBucketScriptRT = rt.type({
  id: rt.string,
  script: rt.string,
  type: rt.literal('calculation'),
  variables: rt.array(TSVBMetricModelVariableRT),
});

export const TSVBMetricModelDerivativeRT = rt.type({
  id: rt.string,
  field: rt.string,
  unit: rt.string,
  type: rt.literal('derivative'),
});

export const TSVBMetricModelSeriesAggRT = rt.type({
  id: rt.string,
  function: rt.string,
  type: rt.literal('series_agg'),
});

export const TSVBPercentileItemRT = rt.type({
  id: rt.string,
  value: rt.number,
});

export const TSVBMetricModePercentileAggRT = rt.intersection([
  rt.type({
    id: rt.string,
    type: rt.literal('percentile'),
    percentiles: rt.array(TSVBPercentileItemRT),
  }),
  rt.partial({ field: rt.string }),
]);

export const TSVBMetricRT = rt.union([
  TSVBMetricModelCountRT,
  TSVBMetricModelBasicMetricRT,
  TSVBMetricModelBucketScriptRT,
  TSVBMetricModelDerivativeRT,
  TSVBMetricModePercentileAggRT,
  TSVBMetricModelSeriesAggRT,
]);
export type TSVBMetric = rt.TypeOf<typeof TSVBMetricRT>;

export const TSVBSeriesRT = rt.intersection([
  rt.type({
    id: rt.string,
    metrics: rt.array(TSVBMetricRT),
    split_mode: rt.string,
  }),
  rt.partial({
    terms_field: rt.string,
    terms_size: rt.number,
    terms_order_by: rt.string,
    filter: rt.type({
      query: rt.string,
      language: rt.keyof({
        lucene: null,
        kuery: null,
      }),
    }),
  }),
]);

export type TSVBSeries = rt.TypeOf<typeof TSVBSeriesRT>;

export const TSVBMetricModelRT = rt.intersection([
  rt.type({
    id: InventoryMetricRT,
    requires: rt.array(rt.string),
    index_pattern: rt.union([rt.string, rt.array(rt.string)]),
    interval: rt.string,
    time_field: rt.string,
    type: rt.string,
    series: rt.array(TSVBSeriesRT),
  }),
  rt.partial({
    filter: rt.string,
    map_field_to: rt.string,
    id_type: rt.keyof({ cloud: null, node: null }),
    drop_last_bucket: rt.boolean,
  }),
]);

export type TSVBMetricModel = rt.TypeOf<typeof TSVBMetricModelRT>;

export type TSVBMetricModelCreator = (
  timeField: string,
  indexPattern: string | string[],
  interval: string
) => TSVBMetricModel;

export const SnapshotModelMetricAggRT = rt.record(
  rt.string,
  rt.union([
    rt.undefined,
    rt.type({
      field: rt.string,
    }),
  ])
);

export const SnapshotModelBucketScriptRT = rt.type({
  bucket_script: rt.intersection([
    rt.type({
      buckets_path: rt.record(rt.string, rt.union([rt.undefined, rt.string])),
      script: rt.type({
        source: rt.string,
        lang: rt.keyof({ painless: null, expression: null }),
      }),
    }),
    rt.partial({ gap_policy: rt.keyof({ skip: null, insert_zeros: null }) }),
  ]),
});

export const SnapshotModelCumulativeSumRT = rt.type({
  cumulative_sum: rt.type({
    buckets_path: rt.string,
  }),
});

export const SnapshotModelDerivativeRT = rt.type({
  derivative: rt.type({
    buckets_path: rt.string,
    gap_policy: rt.keyof({ skip: null, insert_zeros: null }),
    unit: rt.string,
  }),
});

export const SnapshotModelSumBucketRT = rt.type({
  sum_bucket: rt.type({
    buckets_path: rt.string,
  }),
});

interface SnapshotTermsWithAggregation {
  terms: { field: string };
  aggregations: SnapshotModel;
}

export const SnapshotTermsWithAggregationRT: rt.Type<SnapshotTermsWithAggregation> = rt.recursion(
  'SnapshotModelRT',
  () =>
    rt.type({
      terms: rt.type({ field: rt.string }),
      aggregations: SnapshotModelRT,
    })
);

export const SnapshotModelAggregationRT = rt.union([
  SnapshotModelMetricAggRT,
  SnapshotModelBucketScriptRT,
  SnapshotModelCumulativeSumRT,
  SnapshotModelDerivativeRT,
  SnapshotModelSumBucketRT,
  SnapshotTermsWithAggregationRT,
]);

export const SnapshotModelRT = rt.record(
  rt.string,
  rt.union([rt.undefined, SnapshotModelAggregationRT])
);
export type SnapshotModel = rt.TypeOf<typeof SnapshotModelRT>;

export const SnapshotMetricTypeRT = rt.keyof({
  count: null,
  cpu: null,
  load: null,
  memory: null,
  tx: null,
  rx: null,
  logRate: null,
  diskIOReadBytes: null,
  diskIOWriteBytes: null,
  s3TotalRequests: null,
  s3NumberOfObjects: null,
  s3BucketSize: null,
  s3DownloadBytes: null,
  s3UploadBytes: null,
  rdsConnections: null,
  rdsQueriesExecuted: null,
  rdsActiveTransactions: null,
  rdsLatency: null,
  sqsMessagesVisible: null,
  sqsMessagesDelayed: null,
  sqsMessagesSent: null,
  sqsMessagesEmpty: null,
  sqsOldestMessage: null,
  custom: null,
});

export type SnapshotMetricType = rt.TypeOf<typeof SnapshotMetricTypeRT>;

export interface InventoryMetrics {
  tsvb: { [name: string]: TSVBMetricModelCreator };
  snapshot: { [name: string]: SnapshotModel };
  defaultSnapshot: SnapshotMetricType;
  /** This is used by the inventory view to calculate the appropriate amount of time for the metrics detail page. Some metris like awsS3 require multiple days where others like host only need an hour.*/
  defaultTimeRangeInSeconds: number;
}

export interface InventoryModel {
  id: string;
  displayName: string;
  singularDisplayName: string;
  requiredModule: string;
  fields: {
    id: string;
    name: string;
    ip?: string;
  };
  crosslinkSupport: {
    details: boolean;
    logs: boolean;
    apm: boolean;
    uptime: boolean;
  };
  metrics: InventoryMetrics;
  requiredMetrics: InventoryMetric[];
  tooltipMetrics: SnapshotMetricType[];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ByteSize,
  IndicesDataLifecycleWithRollover,
  IndicesDataStream,
  IndicesDataStreamsStatsDataStreamsStatsItem,
  Metadata,
} from '@elastic/elasticsearch/lib/api/types';

interface TimestampFieldFromEs {
  name: string;
}

type TimestampField = TimestampFieldFromEs;

interface PrivilegesFromEs {
  delete_index: boolean;
  manage_data_stream_lifecycle: boolean;
}

type Privileges = PrivilegesFromEs;

export type HealthFromEs = 'GREEN' | 'YELLOW' | 'RED';

export interface DataStreamIndexFromEs {
  index_name: string;
  index_uuid: string;
  prefer_ilm: boolean;
  managed_by: string;
}

export type Health = 'green' | 'yellow' | 'red';

export interface EnhancedDataStreamFromEs extends IndicesDataStream {
  store_size?: IndicesDataStreamsStatsDataStreamsStatsItem['store_size'];
  store_size_bytes?: IndicesDataStreamsStatsDataStreamsStatsItem['store_size_bytes'];
  maximum_timestamp?: IndicesDataStreamsStatsDataStreamsStatsItem['maximum_timestamp'];
  indices: DataStreamIndexFromEs[];
  next_generation_managed_by: string;
  privileges: {
    delete_index: boolean;
    manage_data_stream_lifecycle: boolean;
  };
}

export interface DataStream {
  name: string;
  timeStampField: TimestampField;
  indices: DataStreamIndex[];
  generation: number;
  health: Health;
  indexTemplateName: string;
  ilmPolicyName?: string;
  storageSize?: ByteSize;
  storageSizeBytes?: number;
  maxTimeStamp?: number;
  _meta?: Metadata;
  privileges: Privileges;
  hidden: boolean;
  nextGenerationManagedBy: string;
  lifecycle?: IndicesDataLifecycleWithRollover & {
    enabled?: boolean;
  };
}

export interface DataStreamIndex {
  name: string;
  uuid: string;
  preferILM: boolean;
  managedBy: string;
}

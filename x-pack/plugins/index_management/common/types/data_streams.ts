/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface TimestampFieldFromEs {
  name: string;
}

type TimestampField = TimestampFieldFromEs;

export type HealthFromEs = 'GREEN' | 'YELLOW' | 'RED';

export interface DataStreamFromEs {
  name: string;
  timestamp_field: TimestampFieldFromEs;
  indices: DataStreamIndexFromEs[];
  generation: number;
  status: HealthFromEs;
  template: string;
  ilm_policy?: string;
  store_size?: string;
  maximum_timestamp?: number;
}

export interface DataStreamIndexFromEs {
  index_name: string;
  index_uuid: string;
}

export type Health = 'green' | 'yellow' | 'red';

export interface DataStream {
  name: string;
  timeStampField: TimestampField;
  indices: DataStreamIndex[];
  generation: number;
  health: Health;
  indexTemplateName: string;
  ilmPolicyName?: string;
  storageSize?: string;
  maxTimeStamp?: number;
}

export interface DataStreamIndex {
  name: string;
  uuid: string;
}

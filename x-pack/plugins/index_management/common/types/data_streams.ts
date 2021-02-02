/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface TimestampFieldFromEs {
  name: string;
}

type TimestampField = TimestampFieldFromEs;

interface MetaFromEs {
  managed_by: string;
  package: any;
  managed: boolean;
}

type Meta = MetaFromEs;

interface PrivilegesFromEs {
  delete_index: boolean;
}

type Privileges = PrivilegesFromEs;

export type HealthFromEs = 'GREEN' | 'YELLOW' | 'RED';

export interface DataStreamFromEs {
  name: string;
  timestamp_field: TimestampFieldFromEs;
  indices: DataStreamIndexFromEs[];
  generation: number;
  _meta?: MetaFromEs;
  status: HealthFromEs;
  template: string;
  ilm_policy?: string;
  store_size?: string;
  store_size_bytes?: number;
  maximum_timestamp?: number;
  privileges: PrivilegesFromEs;
  hidden: boolean;
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
  storageSizeBytes?: number;
  maxTimeStamp?: number;
  _meta?: Meta;
  privileges: Privileges;
  hidden: boolean;
}

export interface DataStreamIndex {
  name: string;
  uuid: string;
}

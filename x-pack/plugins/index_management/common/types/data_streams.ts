/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface TimestampFieldFromEs {
  name: string;
}

type TimestampField = TimestampFieldFromEs;

export interface DataStreamFromEs {
  name: string;
  timestamp_field: TimestampFieldFromEs;
  indices: DataStreamIndexFromEs[];
  generation: number;
}

export interface DataStreamIndexFromEs {
  index_name: string;
  index_uuid: string;
}

export interface DataStream {
  name: string;
  timeStampField: TimestampField;
  indices: DataStreamIndex[];
  generation: number;
}

export interface DataStreamIndex {
  name: string;
  uuid: string;
}

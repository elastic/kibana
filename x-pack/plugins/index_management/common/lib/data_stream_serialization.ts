/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataStream, DataStreamFromEs } from '../types';

export function deserializeDataStreamList(dataStreamsFromEs: DataStreamFromEs[]): DataStream[] {
  return dataStreamsFromEs.map(({ name, timestamp_field, indices, generation }) => ({
    name,
    timeStampField: timestamp_field,
    indices: indices.map(
      ({ index_name, index_uuid }: { index_name: string; index_uuid: string }) => ({
        name: index_name,
        uuid: index_uuid,
      })
    ),
    generation,
  }));
}

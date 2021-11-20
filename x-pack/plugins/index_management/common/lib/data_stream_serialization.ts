/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStream, DataStreamFromEs, Health } from '../types';

export function deserializeDataStream(dataStreamFromEs: DataStreamFromEs): DataStream {
  const {
    name,
    timestamp_field: timeStampField,
    indices,
    generation,
    status,
    template,
    ilm_policy: ilmPolicyName,
    store_size: storageSize,
    store_size_bytes: storageSizeBytes,
    maximum_timestamp: maxTimeStamp,
    _meta,
    privileges,
    hidden,
  } = dataStreamFromEs;

  return {
    name,
    timeStampField,
    indices: indices.map(
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ({ index_name, index_uuid }: { index_name: string; index_uuid: string }) => ({
        name: index_name,
        uuid: index_uuid,
      })
    ),
    generation,
    health: status.toLowerCase() as Health, // ES typically returns status in all-caps
    indexTemplateName: template,
    ilmPolicyName,
    storageSize,
    storageSizeBytes,
    maxTimeStamp,
    _meta,
    privileges,
    hidden,
  };
}

export function deserializeDataStreamList(dataStreamsFromEs: DataStreamFromEs[]): DataStream[] {
  return dataStreamsFromEs.map((dataStream) => deserializeDataStream(dataStream));
}

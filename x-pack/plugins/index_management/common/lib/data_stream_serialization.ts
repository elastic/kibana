/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    maximum_timestamp: maxTimeStamp,
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
    maxTimeStamp,
  };
}

export function deserializeDataStreamList(dataStreamsFromEs: DataStreamFromEs[]): DataStream[] {
  return dataStreamsFromEs.map((dataStream) => deserializeDataStream(dataStream));
}

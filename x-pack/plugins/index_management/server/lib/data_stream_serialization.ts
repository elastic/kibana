/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { DataStream, EnhancedDataStreamFromEs, Health } from '../../common';

export function deserializeDataStream(dataStreamFromEs: EnhancedDataStreamFromEs): DataStream {
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
    metering_size_in_bytes: meteringStorageSizeBytes,
    metering_doc_count: meteringDocsCount,
    _meta,
    privileges,
    hidden,
    lifecycle,
    next_generation_managed_by: nextGenerationManagedBy,
  } = dataStreamFromEs;
  const meteringStorageSize =
    meteringStorageSizeBytes !== undefined
      ? new ByteSizeValue(meteringStorageSizeBytes).toString()
      : undefined;

  return {
    name,
    timeStampField,
    indices: indices.map(
      ({
        index_name: indexName,
        index_uuid: indexUuid,
        prefer_ilm: preferILM,
        managed_by: managedBy,
      }: {
        index_name: string;
        index_uuid: string;
        prefer_ilm: boolean;
        managed_by: string;
      }) => ({
        name: indexName,
        uuid: indexUuid,
        preferILM,
        managedBy,
      })
    ),
    generation,
    health: status.toLowerCase() as Health, // ES typically returns status in all-caps
    indexTemplateName: template,
    ilmPolicyName,
    storageSize,
    storageSizeBytes,
    maxTimeStamp,
    meteringStorageSize,
    meteringStorageSizeBytes,
    meteringDocsCount,
    _meta,
    privileges,
    hidden,
    lifecycle,
    nextGenerationManagedBy,
  };
}

export function deserializeDataStreamList(
  dataStreamsFromEs: EnhancedDataStreamFromEs[]
): DataStream[] {
  return dataStreamsFromEs.map((dataStream) => deserializeDataStream(dataStream));
}

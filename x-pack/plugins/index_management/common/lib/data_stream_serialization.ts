/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStream, EnhancedDataStreamFromEs, Health } from '../types';

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
    _meta,
    privileges,
    hidden,
    lifecycle,
    hasIlmPolicyWithDeletePhase,
    next_generation_managed_by,
  } = dataStreamFromEs;

  return {
    name,
    timeStampField,
    indices: indices.map(
      ({
        index_name,
        index_uuid,
        prefer_ilm,
        managed_by,
      }: {
        index_name: string;
        index_uuid: string;
        prefer_ilm: boolean;
        managed_by: string;
      }) => ({
        name: index_name,
        uuid: index_uuid,
        preferILM: prefer_ilm,
        managedBy: managed_by,
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
    lifecycle,
    hasIlmPolicyWithDeletePhase,
    nextGenerationManagedBy: next_generation_managed_by,
  };
}

export function deserializeDataStreamList(
  dataStreamsFromEs: EnhancedDataStreamFromEs[]
): DataStream[] {
  return dataStreamsFromEs.map((dataStream) => deserializeDataStream(dataStream));
}

export const splitSizeAndUnits = (field: string): { size: string; unit: string } => {
  let size = '';
  let unit = '';

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = result[1];
    unit = result[2];
  }

  return {
    size,
    unit,
  };
};

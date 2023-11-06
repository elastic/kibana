/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStream, EnhancedDataStreamFromEs, Health, DataRetention } from '../types';

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
    next_generation_managed_by: nextGenerationManagedBy,
  } = dataStreamFromEs;

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

export const serializeAsESLifecycle = (lifecycle?: DataRetention): DataStream['lifecycle'] => {
  if (!lifecycle || !lifecycle?.enabled) {
    return undefined;
  }

  const { infiniteDataRetention, value, unit } = lifecycle;

  if (infiniteDataRetention) {
    return {
      enabled: true,
    };
  }

  return {
    enabled: true,
    data_retention: `${value}${unit}`,
  };
};

export const deserializeESLifecycle = (lifecycle?: DataStream['lifecycle']): DataRetention => {
  if (!lifecycle || !lifecycle?.enabled) {
    return { enabled: false };
  }

  if (!lifecycle.data_retention) {
    return {
      enabled: true,
      infiniteDataRetention: true,
    };
  }

  const { size, unit } = splitSizeAndUnits(lifecycle.data_retention as string);

  return {
    enabled: true,
    value: Number(size),
    unit,
  };
};

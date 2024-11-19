/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeStackTraceResponse } from '@kbn/profiling-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProfilingESClient } from '../../../common/profiling_es_client';

interface Params {
  client: ProfilingESClient;
  sampleSize: number;
  durationSeconds: number;
  co2PerKWH: number;
  datacenterPUE: number;
  pervCPUWattX86: number;
  pervCPUWattArm64: number;
  awsCostDiscountRate: number;
  costPervCPUPerHour: number;
  azureCostDiscountRate: number;
  showErrorFrames: boolean;
  indices?: string[];
  stacktraceIdsField?: string;
  query: QueryDslQueryContainer;
}

export async function searchStackTraces({
  client,
  sampleSize,
  durationSeconds,
  co2PerKWH,
  datacenterPUE,
  pervCPUWattX86,
  pervCPUWattArm64,
  awsCostDiscountRate,
  costPervCPUPerHour,
  azureCostDiscountRate,
  showErrorFrames,
  indices,
  query,
  stacktraceIdsField,
}: Params) {
  const response = await client.profilingStacktraces({
    query,
    sampleSize,
    durationSeconds,
    co2PerKWH,
    datacenterPUE,
    pervCPUWattX86,
    pervCPUWattArm64,
    awsCostDiscountRate,
    costPervCPUPerHour,
    azureCostDiscountRate,
    indices,
    stacktraceIdsField,
  });

  return decodeStackTraceResponse(response, showErrorFrames);
}

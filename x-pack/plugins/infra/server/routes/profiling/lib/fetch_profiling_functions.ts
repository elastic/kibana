/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { TopNFunctions } from '@kbn/profiling-utils';
import {
  profilingAWSCostDiscountRate,
  profilingCo2PerKWH,
  profilingCostPervCPUPerHour,
  profilingDatacenterPUE,
  profilingPervCPUWattArm64,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';
import { HOST_FIELD } from '../../../../common/constants';
import type { InfraProfilingFunctionsRequestParams } from '../../../../common/http_api/profiling_api';

export async function fetchProfilingFunctions(
  params: InfraProfilingFunctionsRequestParams,
  profilingDataAccess: ProfilingDataAccessPluginStart,
  coreRequestContext: CoreRequestHandlerContext
): Promise<TopNFunctions> {
  const { hostname, from, to, startIndex, endIndex } = params;
  const [
    co2PerKWH,
    datacenterPUE,
    pervCPUWattX86,
    pervCPUWattArm64,
    awsCostDiscountRate,
    costPervCPUPerHour,
  ] = await Promise.all([
    coreRequestContext.uiSettings.client.get<number>(profilingCo2PerKWH),
    coreRequestContext.uiSettings.client.get<number>(profilingDatacenterPUE),
    coreRequestContext.uiSettings.client.get<number>(profilingPervCPUWattX86),
    coreRequestContext.uiSettings.client.get<number>(profilingPervCPUWattArm64),
    coreRequestContext.uiSettings.client.get<number>(profilingAWSCostDiscountRate),
    coreRequestContext.uiSettings.client.get<number>(profilingCostPervCPUPerHour),
  ]);

  return await profilingDataAccess.services.fetchFunction({
    esClient: coreRequestContext.elasticsearch.client.asCurrentUser,
    rangeFromMs: from,
    rangeToMs: to,
    kuery: `${HOST_FIELD} : "${hostname}"`,
    startIndex,
    endIndex,
    co2PerKWH,
    datacenterPUE,
    pervCPUWattX86,
    pervCPUWattArm64,
    awsCostDiscountRate,
    costPervCPUPerHour,
  });
}

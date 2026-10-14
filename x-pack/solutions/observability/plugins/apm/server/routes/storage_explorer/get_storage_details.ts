/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Environment, IndexLifecyclePhaseSelectOption } from '@kbn/apm-types';
import type { StorageDetailsResponse } from '@kbn/apm-api-shared';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { ApmPluginRequestHandlerContext } from '../typings';
import {
  getStorageDetailsPerIndex,
  getStorageDetailsPerProcessorEvent,
} from './get_storage_details_per_service';

export async function getStorageDetails({
  apmEventClient,
  context,
  indexLifecyclePhase,
  randomSampler,
  environment,
  kuery,
  start,
  end,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  environment: Environment;
  kuery: string;
  start: number;
  end: number;
  serviceName: string;
}): Promise<StorageDetailsResponse> {
  const [processorEventStats, indicesStats] = await Promise.all([
    getStorageDetailsPerProcessorEvent({
      apmEventClient,
      context,
      indexLifecyclePhase,
      randomSampler,
      environment,
      kuery,
      start,
      end,
      serviceName,
    }),
    getStorageDetailsPerIndex({
      apmEventClient,
      context,
      indexLifecyclePhase,
      randomSampler,
      environment,
      kuery,
      start,
      end,
      serviceName,
    }),
  ]);

  return { processorEventStats, indicesStats };
}

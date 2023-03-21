/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getServiceTransactionDetailedStatsPeriods } from './get_service_transaction_detailed_statistics';

export async function getServicesDetailedStatistics({
  serviceNames,
  environment,
  kuery,
  apmEventClient,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  return getServiceTransactionDetailedStatsPeriods({
    serviceNames,
    environment,
    kuery,
    apmEventClient,
    start,
    end,
    randomSampler,
    offset,
    documentType,
    rollupInterval,
    bucketSizeInSeconds,
  });
}

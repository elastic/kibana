/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { Filter } from '@kbn/es-query';
import type { AnomalyResults } from '../../../machine_learning';
import { getAnomalies } from '../../../machine_learning';

export const findMlSignals = async ({
  ml,
  request,
  savedObjectsClient,
  jobIds,
  anomalyThreshold,
  from,
  to,
  exceptionFilter,
}: {
  ml: MlPluginSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  jobIds: string[];
  anomalyThreshold: number;
  from: string;
  to: string;
  exceptionFilter: Filter | undefined;
}): Promise<AnomalyResults> => {
  const { mlAnomalySearch } = ml.mlSystemProvider(request, savedObjectsClient);
  const params = {
    jobIds,
    threshold: anomalyThreshold,
    earliestMs: dateMath.parse(from)?.valueOf() ?? 0,
    latestMs: dateMath.parse(to)?.valueOf() ?? 0,
    exceptionFilter,
  };
  return getAnomalies(params, mlAnomalySearch);
};

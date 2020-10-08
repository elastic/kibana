/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { MlPluginSetup } from '../../../../../ml/server';
import { AnomalyResults, getAnomalies } from '../../machine_learning';

export const findMlSignals = async ({
  ml,
  request,
  savedObjectsClient,
  jobId,
  anomalyThreshold,
  from,
  to,
}: {
  ml: MlPluginSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  jobId: string;
  anomalyThreshold: number;
  from: string;
  to: string;
}): Promise<AnomalyResults> => {
  const { mlAnomalySearch } = ml.mlSystemProvider(request, savedObjectsClient);
  const params = {
    jobIds: [jobId],
    threshold: anomalyThreshold,
    earliestMs: dateMath.parse(from)?.valueOf() ?? 0,
    latestMs: dateMath.parse(to)?.valueOf() ?? 0,
  };
  return getAnomalies(params, mlAnomalySearch);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { ExceptionListItemSchema } from '../../../../../lists/common';

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
  exceptionItems,
}: {
  ml: MlPluginSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  jobId: string;
  anomalyThreshold: number;
  from: string;
  to: string;
  exceptionItems: ExceptionListItemSchema[];
}): Promise<AnomalyResults> => {
  const { mlAnomalySearch } = ml.mlSystemProvider(request, savedObjectsClient);
  const params = {
    jobIds: [jobId],
    threshold: anomalyThreshold,
    earliestMs: dateMath.parse(from)?.valueOf() ?? 0,
    latestMs: dateMath.parse(to)?.valueOf() ?? 0,
    exceptionItems,
  };
  return getAnomalies(params, mlAnomalySearch);
};

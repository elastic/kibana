/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { MlPluginSetup } from '../../../../../ml/server';
import { AnomalyResults, getAnomalies } from '../../machine_learning';

export const findMlSignals = async ({
  ml,
  request,
  savedObjectsClient,
  jobIds,
  anomalyThreshold,
  from,
  to,
  exceptionItems,
}: {
  ml: MlPluginSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  jobIds: string[];
  anomalyThreshold: number;
  from: string;
  to: string;
  exceptionItems: ExceptionListItemSchema[];
}): Promise<AnomalyResults> => {
  const { mlAnomalySearch } = ml.mlSystemProvider(request, savedObjectsClient);
  const params = {
    jobIds,
    threshold: anomalyThreshold,
    earliestMs: dateMath.parse(from)?.valueOf() ?? 0,
    latestMs: dateMath.parse(to)?.valueOf() ?? 0,
    exceptionItems,
  };
  return getAnomalies(params, mlAnomalySearch);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getCountsAndMaxData } from './utils';

export const getUserActionsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['userActions']> => {
  const res = await getCountsAndMaxData({
    savedObjectsClient,
    savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
  });

  return res;
};

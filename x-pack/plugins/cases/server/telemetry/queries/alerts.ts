/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getCountsAndMaxData, getOnlyAlertsCommentsFilter } from './utils';

export const getAlertsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['comments']> => {
  const res = await getCountsAndMaxData({
    savedObjectsClient,
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
    filter: getOnlyAlertsCommentsFilter(),
  });

  return res;
};

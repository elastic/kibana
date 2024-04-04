/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';
import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';

interface Aggs {
  counterSum: { value: number };
  totalRules: { value: number };
}

export const getCasesSystemActionData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['casesSystemAction']> => {
  const res = await savedObjectsClient.find<unknown, Aggs>({
    page: 1,
    perPage: 1,
    type: CASE_ORACLE_SAVED_OBJECT,
    aggs: {
      counterSum: { sum: { field: `${CASE_ORACLE_SAVED_OBJECT}.attributes.counter` } },
      totalRules: {
        cardinality: { field: `${CASE_ORACLE_SAVED_OBJECT}.attributes.rules.id` },
      },
    },
  });

  return {
    totalCasesCreated: res.aggregations?.counterSum?.value ?? 0,
    totalRules: res.aggregations?.totalRules?.value ?? 0,
  };
};

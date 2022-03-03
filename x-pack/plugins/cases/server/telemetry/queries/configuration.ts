/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../common/constants';
import { Buckets, CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { findValueInBuckets } from './utils';

export const getConfigurationTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['configuration']> => {
  const res = await savedObjectsClient.find<
    unknown,
    {
      closureType: Buckets;
    }
  >({
    page: 0,
    perPage: 0,
    type: CASE_CONFIGURE_SAVED_OBJECT,
    aggs: {
      closureType: {
        terms: { field: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.closure_type` },
      },
    },
  });

  const closureBuckets = res.aggregations?.closureType?.buckets ?? [];

  return {
    all: {
      closure: {
        manually: findValueInBuckets(closureBuckets, 'close-by-user'),
        automatic: findValueInBuckets(closureBuckets, 'close-by-pushing'),
      },
    },
  };
};

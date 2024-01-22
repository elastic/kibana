/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../common/constants';
import type { Buckets, CasesTelemetry, CollectTelemetryDataParams } from '../types';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import { findValueInBuckets } from './utils';

export const getConfigurationTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['configuration']> => {
  const res = await savedObjectsClient.find<
    { customFields: ConfigurationPersistedAttributes['customFields'] },
    {
      closureType: Buckets;
    }
  >({
    page: 1,
    perPage: 1,
    type: CASE_CONFIGURE_SAVED_OBJECT,
    aggs: {
      closureType: {
        terms: { field: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.closure_type` },
      },
    },
  });

  let customFiledTypes: Record<string, number> = {};

  const totalsByType = res.saved_objects[0].attributes.customFields?.reduce((a, c) => {
    if (c.type) {
      customFiledTypes = { ...customFiledTypes, [c.type]: (customFiledTypes[c.type] ?? 0) + 1 };
    }

    return { ...customFiledTypes };
  }, {});

  console.log({ totalsByType });

  const closureBuckets = res.aggregations?.closureType?.buckets ?? [];

  return {
    all: {
      closure: {
        manually: findValueInBuckets(closureBuckets, 'close-by-user'),
        automatic: findValueInBuckets(closureBuckets, 'close-by-pushing'),
      },
      customFields: {
        totalsByType: totalsByType ?? {},
      },
    },
  };
};

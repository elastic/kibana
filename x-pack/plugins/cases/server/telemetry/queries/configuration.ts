/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../common/constants';
import type { Buckets, CasesTelemetry, CollectTelemetryDataParams } from '../types';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import { findValueInBuckets, getCustomFieldsTelemetry } from './utils';
import { Owner } from '@kbn/cases-plugin/common/constants/types';

export const getConfigurationTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['configuration']> => {
  const res = await savedObjectsClient.find<
    { customFields: ConfigurationPersistedAttributes['customFields']; owner: Owner },
    {
      closureType: Buckets;
    }
  >({
    page: 1,
    perPage: 5,
    type: CASE_CONFIGURE_SAVED_OBJECT,
    aggs: {
      closureType: {
        terms: { field: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.closure_type` },
      },
    },
  });

  const closureBuckets = res.aggregations?.closureType?.buckets ?? [];

  const allCustomFields = res.saved_objects.map((sObj) => sObj.attributes.customFields).flat();

  const secCustomFields = res.saved_objects.filter(
    (secSO) => secSO.attributes.owner === 'securitySolution'
  )[0]?.attributes.customFields;

  const obsCustomFields = res.saved_objects.filter(
    (obsSO) => obsSO.attributes.owner === 'observability'
  )[0]?.attributes.customFields;

  const mainCustomFields = res.saved_objects.filter(
    (mainSO) => mainSO.attributes.owner === 'cases'
  )[0]?.attributes.customFields;

  return {
    all: {
      closure: {
        manually: findValueInBuckets(closureBuckets, 'close-by-user'),
        automatic: findValueInBuckets(closureBuckets, 'close-by-pushing'),
      },
      customFields: getCustomFieldsTelemetry(
        allCustomFields as ConfigurationPersistedAttributes['customFields']
      ),
    },
    sec: {
      customFields: getCustomFieldsTelemetry(secCustomFields),
    },
    obs: {
      customFields: getCustomFieldsTelemetry(obsCustomFields),
    },
    main: {
      customFields: getCustomFieldsTelemetry(mainCustomFields),
    },
  };
};

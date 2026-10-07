/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getServiceNamesFromTermsEnum } from './get_service_names_from_terms_enum';

describe('getServiceNamesFromTermsEnum missing APM indices', () => {
  const baseArgs = {
    environment: ENVIRONMENT_ALL.value,
    maxNumberOfServices: 500,
    start: 0,
    end: Date.now(),
  };

  it('returns an empty service list when a configured APM index does not exist', async () => {
    const missingIndex = new Error('index_not_found_exception: no such index [traces-apm-missing]');

    const apmEventClient = {
      termsEnum: jest.fn().mockRejectedValue(missingIndex),
    } as unknown as APMEventClient;

    await expect(
      getServiceNamesFromTermsEnum({
        apmEventClient,
        ...baseArgs,
      })
    ).resolves.toEqual([]);
  });

  it('does not hide unrelated Elasticsearch errors', async () => {
    const securityError = new Error('security_exception: missing view_index_metadata privilege');

    const apmEventClient = {
      termsEnum: jest.fn().mockRejectedValue(securityError),
    } as unknown as APMEventClient;

    await expect(
      getServiceNamesFromTermsEnum({
        apmEventClient,
        ...baseArgs,
      })
    ).rejects.toBe(securityError);
  });
});

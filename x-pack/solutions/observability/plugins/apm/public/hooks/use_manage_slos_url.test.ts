/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
import { ALL_VALUE } from '@kbn/slo-schema';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { getManageSlosUrl } from './use_manage_slos_url';

describe('getManageSlosUrl', () => {
  const getRedirectUrl = jest.fn().mockReturnValue('/app/slo');
  const sloListLocator = { getRedirectUrl } as unknown as LocatorPublic<SloListLocatorParams>;

  const getEnvironmentFilter = (): Filter | undefined => {
    const [{ filters }] = getRedirectUrl.mock.calls.at(-1) as [{ filters: Filter[] }];
    return filters.find((filter) => filter.meta.key === 'service.environment');
  };

  beforeEach(() => {
    getRedirectUrl.mockClear();
  });

  it('returns undefined when no locator is available', () => {
    expect(getManageSlosUrl(undefined, { serviceName: 'frontend' })).toBeUndefined();
  });

  it('matches the selected environment as well as all-environment SLOs (missing/`*` service.environment)', () => {
    getManageSlosUrl(sloListLocator, { serviceName: 'frontend', environment: 'oteldemo' });

    const environmentFilter = getEnvironmentFilter();
    expect(environmentFilter).toEqual({
      meta: {
        alias: 'service.environment: oteldemo or all environments',
        disabled: false,
        key: 'service.environment',
        negate: false,
        type: 'custom',
      },
      query: {
        bool: {
          minimum_should_match: 1,
          should: [
            { match_phrase: { 'service.environment': 'oteldemo' } },
            { match_phrase: { 'service.environment': ALL_VALUE } },
            { bool: { must_not: { exists: { field: 'service.environment' } } } },
          ],
        },
      },
    });
  });

  it('does not add an environment filter when the "all" environment is selected', () => {
    getManageSlosUrl(sloListLocator, {
      serviceName: 'frontend',
      environment: ENVIRONMENT_ALL.value,
    });

    expect(getEnvironmentFilter()).toBeUndefined();
  });

  it('does not add an environment filter when no environment is provided', () => {
    getManageSlosUrl(sloListLocator, { serviceName: 'frontend' });

    expect(getEnvironmentFilter()).toBeUndefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { UseInsightDataProvidersProps, Provider } from './use_insight_data_providers';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import {
  useInsightDataProviders,
  type UseInsightDataProvidersResult,
} from './use_insight_data_providers';
import { mockAlertDetailsData } from '../../../event_details/mocks';

const mockAlertDetailsDataWithIsObject = mockAlertDetailsData.map((detail) => {
  return {
    ...detail,
    isObjectArray: false,
  };
}) as TimelineEventsDetailsItem[];

const nestedAndProvider: Provider[][] = [
  [
    {
      field: 'event.id',
      value: '{{kibana.alert.rule.uuid}}',
      queryType: 'phrase',
      excluded: false,
    },
  ],
  [
    {
      field: 'event.category',
      value: 'network',
      queryType: 'phrase',
      excluded: false,
    },
    {
      field: 'process.pid',
      value: '{{process.pid}}',
      queryType: 'phrase',
      excluded: false,
    },
  ],
];

const topLevelOnly = [
  [
    {
      field: 'event.id',
      value: '{{kibana.alert.rule.uuid}}',
      queryType: 'phrase',
      excluded: false,
    },
  ],
  [
    {
      field: 'event.category',
      value: 'network',
      queryType: 'phrase',
      excluded: false,
    },
  ],
  [
    {
      field: 'process.pid',
      value: 1000,
      valueType: 'number',
      queryType: 'phrase',
      excluded: false,
    },
  ],
];

const nonExistantField: Provider[][] = [
  [
    {
      field: 'event.id',
      value: '{{kibana.alert.rule.parameters.threshold.field}}',
      excluded: false,
      queryType: 'phrase',
    },
  ],
];

const providerWithRange: Provider[][] = [
  [
    {
      field: 'event.id',
      value: '',
      excluded: false,
      queryType: 'exists',
    },
    {
      field: 'event.id',
      value: '{"gte":0,"lt":100}',
      excluded: false,
      queryType: 'range',
    },
  ],
];

describe('useInsightDataProviders', () => {
  it('should return 2 data providers, 1 with a nested provider ANDed to it', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, UseInsightDataProvidersResult>(() =>
      useInsightDataProviders({
        providers: nestedAndProvider,
        alertData: mockAlertDetailsDataWithIsObject,
      })
    );
    const { dataProviders: providers, filters } = result.current;
    const providersWithNonEmptyAnd = providers.filter((provider) => provider.and.length > 0);
    expect(providers.length).toBe(2);
    expect(providersWithNonEmptyAnd.length).toBe(1);
    expect(filters.length).toBe(0);
  });

  it('should return 3 data providers without any containing nested ANDs', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, UseInsightDataProvidersResult>(() =>
      useInsightDataProviders({
        providers: topLevelOnly,
        alertData: mockAlertDetailsDataWithIsObject,
      })
    );
    const { dataProviders: providers } = result.current;
    const providersWithNonEmptyAnd = providers.filter((provider) => provider.and.length > 0);
    expect(providers.length).toBe(3);
    expect(providersWithNonEmptyAnd.length).toBe(0);
  });

  it('should use the string literal if no field in the alert matches a bracketed value', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, UseInsightDataProvidersResult>(() =>
      useInsightDataProviders({
        providers: nonExistantField,
        alertData: mockAlertDetailsDataWithIsObject,
      })
    );
    const { dataProviders: providers } = result.current;
    const {
      queryMatch: { value },
    } = providers[0];
    expect(providers.length).toBe(1);
    expect(value).toBe('{{kibana.alert.rule.parameters.threshold.field}}');
  });

  it('should use template data providers when called without alertData', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, UseInsightDataProvidersResult>(() =>
      useInsightDataProviders({
        providers: nestedAndProvider,
      })
    );
    const { dataProviders: providers } = result.current;
    const [first, second] = providers;
    const [nestedSecond] = second.and;
    expect(second.type).toBe('default');
    expect(first.type).toBe('template');
    expect(nestedSecond.type).toBe('template');
  });

  it('should return an empty array of dataProviders and populated filters if a provider contains a range type', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, UseInsightDataProvidersResult>(() =>
      useInsightDataProviders({
        providers: providerWithRange,
      })
    );
    const { dataProviders: providers, filters } = result.current;
    expect(providers.length).toBe(0);
    expect(filters.length > providers.length);
  });
});

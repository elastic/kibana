/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import type { UseInsightDataProvidersProps, Provider } from './use_insight_data_providers';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import { useInsightDataProviders } from './use_insight_data_providers';
import { mockAlertDetailsData } from '../../../event_details/__mocks__';

const mockAlertDetailsDataWithIsObject = mockAlertDetailsData.map((detail) => {
  return {
    ...detail,
    isObjectArray: false,
  };
}) as TimelineEventsDetailsItem[];

const nestedAndProvider = [
  [
    {
      field: 'event.id',
      value: 'kibana.alert.rule.uuid',
      type: 'parameter',
    },
  ],
  [
    {
      field: 'event.category',
      value: 'network',
      type: 'literal',
    },
    {
      field: 'process.pid',
      value: 'process.pid',
      type: 'parameter',
    },
  ],
] as Provider[][];

const topLevelOnly = [
  [
    {
      field: 'event.id',
      value: 'kibana.alert.rule.uuid',
      type: 'parameter',
    },
  ],
  [
    {
      field: 'event.category',
      value: 'network',
      type: 'literal',
    },
  ],
  [
    {
      field: 'process.pid',
      value: 'process.pid',
      type: 'parameter',
    },
  ],
] as Provider[][];

const nonExistantField = [
  [
    {
      field: 'event.id',
      value: 'kibana.alert.rule.parameters.threshold.field',
      type: 'parameter',
    },
  ],
] as Provider[][];

describe('useInsightDataProviders', () => {
  it('should return 2 data providers, 1 with a nested provider ANDed to it', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, DataProvider[]>(() =>
      useInsightDataProviders({
        providers: nestedAndProvider,
        alertData: mockAlertDetailsDataWithIsObject,
      })
    );
    const providers = result.current;
    const providersWithNonEmptyAnd = providers.filter((provider) => provider.and.length > 0);
    expect(providers.length).toBe(2);
    expect(providersWithNonEmptyAnd.length).toBe(1);
  });

  it('should return 3 data providers without any containing nested ANDs', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, DataProvider[]>(() =>
      useInsightDataProviders({
        providers: topLevelOnly,
        alertData: mockAlertDetailsDataWithIsObject,
      })
    );
    const providers = result.current;
    const providersWithNonEmptyAnd = providers.filter((provider) => provider.and.length > 0);
    expect(providers.length).toBe(3);
    expect(providersWithNonEmptyAnd.length).toBe(0);
  });

  it('should use a wildcard for a field not present in an alert', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, DataProvider[]>(() =>
      useInsightDataProviders({
        providers: nonExistantField,
        alertData: mockAlertDetailsDataWithIsObject,
      })
    );
    const providers = result.current;
    const {
      queryMatch: { value },
    } = providers[0];
    expect(providers.length).toBe(1);
    expect(value).toBe('*');
  });

  it('should use template data providers when called without alertData', () => {
    const { result } = renderHook<UseInsightDataProvidersProps, DataProvider[]>(() =>
      useInsightDataProviders({
        providers: nestedAndProvider,
      })
    );
    const providers = result.current;
    const [first, second] = providers;
    const [nestedSecond] = second.and;
    expect(second.type).toBe('default');
    expect(first.type).toBe('template');
    expect(nestedSecond.type).toBe('template');
  });
});

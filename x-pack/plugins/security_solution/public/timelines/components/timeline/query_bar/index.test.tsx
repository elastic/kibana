/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../../../common/constants';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { convertKueryToElasticSearchQuery } from '../../../../common/lib/keury';
import { mockIndexPattern, TestProviders } from '../../../../common/mock';
import { QueryBar } from '../../../../common/components/query_bar';
import { esFilters, FilterManager } from '../../../../../../../../src/plugins/data/public';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { buildGlobalQuery } from '../helpers';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';

import { QueryBarTimeline, getDataProviderFilter, TIMELINE_FILTER_DROP_AREA } from './index';

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_selector');

describe('Timeline QueryBar ', () => {
  const filters = [
    {
      $state: { store: esFilters.FilterStateStore.APP_STATE },
      meta: {
        alias: null,
        controlledBy: TIMELINE_FILTER_DROP_AREA,
        disabled: false,
        index: undefined,
        key: 'event.category',
        negate: true,
        params: { query: 'file' },
        type: 'phrase',
      },
      query: { match: { 'event.category': { query: 'file', type: 'phrase' } } },
    },
  ];
  const state = {
    dataProviders: [],
    timerange: {
      from: '2020-07-07T08:20:18.966Z',
      fromStr: DEFAULT_FROM,
      to: '2020-07-08T08:20:18.966Z',
      toStr: DEFAULT_TO,
    },
    kind: 'kuery',
    expression: 'here: query',
    filters,
    savedQueryId: undefined,
    duration: '',
  };

  beforeEach(() => {
    (useShallowEqualSelector as jest.Mock).mockReturnValue(state);
  });

  test('check if we format the appropriate props to QueryBar', () => {
    const filterManager = new FilterManager(mockUiSettingsForFilterManager);
    const wrapper = mount(
      <TestProviders>
        <QueryBarTimeline
          browserFields={mockBrowserFields}
          filterManager={filterManager}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          timelineId="timeline-real-id"
        />
      </TestProviders>
    );
    const queryBarProps = wrapper.find(QueryBar).props();

    expect(queryBarProps.dateRangeFrom).toEqual('now-24h');
    expect(queryBarProps.dateRangeTo).toEqual('now');
    expect(queryBarProps.filterQuery).toEqual({ query: 'here: query', language: 'kuery' });
    expect(queryBarProps.savedQuery).toEqual(undefined);
    expect(queryBarProps.filters).toHaveLength(1);
  });

  describe('#getDataProviderFilter', () => {
    test('returns valid data provider filter with a simple bool data provider', () => {
      const dataProvidersDsl = convertKueryToElasticSearchQuery(
        buildGlobalQuery(mockDataProviders.slice(0, 1), mockBrowserFields),
        mockIndexPattern
      );
      const filter = getDataProviderFilter(dataProvidersDsl);
      expect(filter).toEqual({
        $state: {
          store: 'appState',
        },
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match_phrase: {
                name: 'Provider 1',
              },
            },
          ],
        },
        meta: {
          alias: 'timeline-filter-drop-area',
          controlledBy: 'timeline-filter-drop-area',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"bool":{"should":[{"match_phrase":{"name":"Provider 1"}}],"minimum_should_match":1}}',
        },
      });
    });

    test('returns valid data provider filter with an exists operator', () => {
      const dataProvidersDsl = convertKueryToElasticSearchQuery(
        buildGlobalQuery(
          [
            {
              id: `id-exists`,
              name,
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'host.name',
                value: '',
                operator: ':*',
              },
              and: [],
            },
          ],
          mockBrowserFields
        ),
        mockIndexPattern
      );
      const filter = getDataProviderFilter(dataProvidersDsl);
      expect(filter).toEqual({
        $state: {
          store: 'appState',
        },
        bool: {
          minimum_should_match: 1,
          should: [
            {
              exists: {
                field: 'host.name',
              },
            },
          ],
        },
        meta: {
          alias: 'timeline-filter-drop-area',
          controlledBy: 'timeline-filter-drop-area',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value: '{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}',
        },
      });
    });
  });
});

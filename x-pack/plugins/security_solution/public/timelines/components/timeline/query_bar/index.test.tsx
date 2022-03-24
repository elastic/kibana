/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../../../common/constants';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { convertKueryToElasticSearchQuery } from '../../../../common/lib/keury';
import { mockIndexPattern, TestProviders } from '../../../../common/mock';
import { QueryBar } from '../../../../common/components/query_bar';
import { FilterStateStore } from '@kbn/es-query';
import { FilterManager } from '../../../../../../../../src/plugins/data/public';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { buildGlobalQuery } from '../helpers';

import {
  QueryBarTimeline,
  QueryBarTimelineComponentProps,
  getDataProviderFilter,
  TIMELINE_FILTER_DROP_AREA,
} from './index';
import { waitFor } from '@testing-library/dom';

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

jest.mock('../../../../common/lib/kibana');

describe('Timeline QueryBar ', () => {
  const mockSetFilters = jest.fn();
  const mockSetSavedQueryId = jest.fn();
  const mockUpdateReduxTime = jest.fn();

  beforeEach(() => {
    mockSetFilters.mockClear();
    mockSetSavedQueryId.mockClear();
    mockUpdateReduxTime.mockClear();
  });

  test('check if we format the appropriate props to QueryBar', () => {
    const filters = [
      {
        $state: { store: FilterStateStore.APP_STATE },
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
      {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          alias: null,
          controlledBy: undefined,
          disabled: false,
          index: undefined,
          key: 'event.category',
          negate: true,
          params: { query: 'process' },
          type: 'phrase',
        },
        query: { match: { 'event.category': { query: 'process', type: 'phrase' } } },
      },
    ];
    const wrapper = mount(
      <TestProviders>
        <QueryBarTimeline
          dataProviders={mockDataProviders}
          filters={filters}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          from={'2020-07-07T08:20:18.966Z'}
          fromStr={DEFAULT_FROM}
          to={'2020-07-08T08:20:18.966Z'}
          toStr={DEFAULT_TO}
          kqlMode="search"
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      </TestProviders>
    );
    const queryBarProps = wrapper.find(QueryBar).props();

    expect(queryBarProps.dateRangeFrom).toEqual('now/d');
    expect(queryBarProps.dateRangeTo).toEqual('now/d');
    expect(queryBarProps.filterQuery).toEqual({ query: 'here: query', language: 'kuery' });
    expect(queryBarProps.savedQuery).toEqual(undefined);
    expect(queryBarProps.filters).toHaveLength(1);
    expect(queryBarProps.filters[0].query).toEqual(filters[1].query);
  });

  describe('#onSubmitQuery', () => {
    test(' is the only reference that changed when filterQuery props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dataProviders={mockDataProviders}
          filters={[]}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          from={'2020-07-07T08:20:18.966Z'}
          fromStr={DEFAULT_FROM}
          to={'2020-07-08T08:20:18.966Z'}
          toStr={DEFAULT_TO}
          kqlMode="search"
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ filterQuery: { expression: 'new: one', kind: 'kuery' } });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
      expect(onSavedQueryRef).toEqual(wrapper.find(QueryBar).props().onSavedQuery);
    });

    test(' is only reference that changed when timelineId props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dataProviders={mockDataProviders}
          filters={[]}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          from={'2020-07-07T08:20:18.966Z'}
          fromStr={DEFAULT_FROM}
          to={'2020-07-08T08:20:18.966Z'}
          toStr={DEFAULT_TO}
          kqlMode="search"
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ timelineId: 'new-timeline' });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
      expect(onSavedQueryRef).toEqual(wrapper.find(QueryBar).props().onSavedQuery);
    });
  });

  describe('#onSavedQuery', () => {
    test('is only reference that changed when dataProviders props get updated', async () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dataProviders={mockDataProviders}
          filters={[]}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          from={'2020-07-07T08:20:18.966Z'}
          fromStr={DEFAULT_FROM}
          to={'2020-07-08T08:20:18.966Z'}
          toStr={DEFAULT_TO}
          kqlMode="search"
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ dataProviders: mockDataProviders.slice(1, 0) });
      await waitFor(() => wrapper.update());

      expect(onSavedQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSavedQuery);
      expect(onSubmitQueryRef).toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
    });

    test('is only reference that changed when savedQueryId props get updated', async () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dataProviders={mockDataProviders}
          filters={[]}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          from={'2020-07-07T08:20:18.966Z'}
          fromStr={DEFAULT_FROM}
          to={'2020-07-08T08:20:18.966Z'}
          toStr={DEFAULT_TO}
          kqlMode="search"
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({
        savedQueryId: 'new',
      });
      await waitFor(() => wrapper.update());

      expect(onSavedQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSavedQuery);
      expect(onSubmitQueryRef).toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
    });
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
              name: 'name',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../../common/constants';
import { TestProviders, mockIndexPattern } from '../../mock';
import { FilterManager } from '@kbn/data-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { QueryBar, QueryBarComponentProps } from '.';
import { setAutocomplete } from '../../../../../../../src/plugins/unified_search/public/services';
import { unifiedSearchPluginMock } from '../../../../../../../src/plugins/unified_search/public/mocks';

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

describe('QueryBar ', () => {
  const mockOnChangeQuery = jest.fn();
  const mockOnSubmitQuery = jest.fn();
  const mockOnSavedQuery = jest.fn();

  const Proxy = (props: QueryBarComponentProps) => (
    <TestProviders>
      <QueryBar {...props} />
    </TestProviders>
  );

  // The data plugin's `SearchBar` is lazy loaded, so we need to ensure it is
  // available before we mount our component with Enzyme.
  const getWrapper = async (Component: ReturnType<typeof Proxy>) => {
    const { getByTestId } = render(Component);
    await waitFor(() => getByTestId('queryInput')); // check for presence of query input
    return mount(Component);
  };
  let abortSpy: jest.SpyInstance;
  beforeAll(() => {
    const mockAbort = new AbortController();
    mockAbort.abort();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => mockAbort);
  });

  afterAll(() => {
    abortSpy.mockRestore();
  });
  beforeEach(() => {
    mockOnChangeQuery.mockClear();
    mockOnSubmitQuery.mockClear();
    mockOnSavedQuery.mockClear();
  });

  test('check if we format the appropriate props to QueryBar', () => {
    const wrapper = mount(
      <TestProviders>
        <QueryBar
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      </TestProviders>
    );
    const {
      customSubmitButton,
      timeHistory,
      onClearSavedQuery,
      onFiltersUpdated,
      onQueryChange,
      onQuerySubmit,
      onSaved,
      onSavedQueryUpdated,
      ...searchBarProps
    } = wrapper.find(SearchBar).props();

    expect(searchBarProps).toEqual({
      dataTestSubj: undefined,
      dateRangeFrom: 'now/d',
      dateRangeTo: 'now/d',
      filters: [],
      indexPatterns: [
        {
          fields: [
            {
              aggregatable: true,
              name: '@timestamp',
              searchable: true,
              type: 'date',
            },
            {
              aggregatable: true,
              name: '@version',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.hostname',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.id',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test1',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test2',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test3',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test4',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test5',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test6',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test7',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test8',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'host.name',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: false,
              name: 'nestedField.firstAttributes',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: false,
              name: 'nestedField.secondAttributes',
              searchable: true,
              type: 'string',
            },
          ],
          title: 'filebeat-*,auditbeat-*,packetbeat-*',
        },
      ],
      isLoading: false,
      isRefreshPaused: true,
      query: {
        language: 'kuery',
        query: 'here: query',
      },
      refreshInterval: undefined,
      savedQuery: undefined,
      showAutoRefreshOnly: false,
      showDatePicker: false,
      showFilterBar: true,
      showQueryBar: true,
      showQueryInput: true,
      showSaveQuery: true,
    });
  });

  describe('#onQuerySubmit', () => {
    test(' is the only reference that changed when filterQuery props get updated', async () => {
      const wrapper = await getWrapper(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      wrapper.setProps({ filterQuery: { expression: 'new: one', kind: 'kuery' } });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      expect(onChangedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSavedQueryRef).toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
    });

    test(' is only reference that changed when timelineId props get updated', async () => {
      const wrapper = await getWrapper(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      wrapper.setProps({ onSubmitQuery: jest.fn() });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      expect(onChangedQueryRef).toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSavedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
    });
  });

  describe('#onSavedQueryUpdated', () => {
    beforeEach(() => {
      const autocompleteStart = unifiedSearchPluginMock.createStartContract();
      setAutocomplete(autocompleteStart.autocomplete);
    });

    test('is only reference that changed when dataProviders props get updated', async () => {
      const wrapper = await getWrapper(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;
      wrapper.setProps({ onSavedQuery: jest.fn() });
      wrapper.update();

      expect(onSavedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
      expect(onChangedQueryRef).toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSubmitQueryRef).toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
    });
  });

  describe('SavedQueryManagementComponent state', () => {
    test('popover should hidden when "Save current query" button was clicked', async () => {
      const wrapper = await getWrapper(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{
            query: 'here: query',
            language: 'kuery',
          }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const isSavedQueryPopoverOpen = () =>
        wrapper.find('EuiPopover[id="savedQueryPopover"]').prop('isOpen');

      expect(isSavedQueryPopoverOpen()).toBeFalsy();

      wrapper
        .find('button[data-test-subj="saved-query-management-popover-button"]')
        .simulate('click');

      await waitFor(() => {
        expect(isSavedQueryPopoverOpen()).toBeTruthy();
      });
      wrapper.find('button[data-test-subj="saved-query-management-save-button"]').simulate('click');

      await waitFor(() => {
        expect(isSavedQueryPopoverOpen()).toBeFalsy();
      });
    });
  });
});

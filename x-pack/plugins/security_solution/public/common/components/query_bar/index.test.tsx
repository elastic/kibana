/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../../common/constants';
import { TestProviders, mockIndexNames } from '../../mock';
import { FilterManager } from '@kbn/data-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { createStubDataView } from '@kbn/data-plugin/common/stubs';
import type { QueryBarComponentProps } from '.';
import { QueryBar } from '.';

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
    const wrapper = mount(Component);
    await waitFor(() => wrapper.find('[data-test-subj="queryInput"]').exists()); // check for presence of query input
    return wrapper;
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

  const mockDataView = createStubDataView({ spec: { title: mockIndexNames.join() } });

  // FLAKY: https://github.com/elastic/kibana/issues/132659
  describe.skip('#onQuerySubmit', () => {
    test(' is the only reference that changed when filterQuery props get updated', async () => {
      await act(async () => {
        const wrapper = await getWrapper(
          <Proxy
            dateRangeFrom={DEFAULT_FROM}
            dateRangeTo={DEFAULT_TO}
            hideSavedQuery={false}
            indexPattern={mockDataView}
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
    });

    test(' is only reference that changed when timelineId props get updated', async () => {
      const wrapper = await getWrapper(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockDataView}
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
    test('is only reference that changed when dataProviders props get updated', async () => {
      await act(async () => {
        const wrapper = await getWrapper(
          <Proxy
            dateRangeFrom={DEFAULT_FROM}
            dateRangeTo={DEFAULT_TO}
            hideSavedQuery={false}
            indexPattern={mockDataView}
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
  });

  describe('SavedQueryManagementComponent state', () => {
    test('popover should remain open when "Save current query" button was clicked', async () => {
      await act(async () => {
        const wrapper = await getWrapper(
          <Proxy
            dateRangeFrom={DEFAULT_FROM}
            dateRangeTo={DEFAULT_TO}
            hideSavedQuery={false}
            indexPattern={mockDataView}
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
          wrapper.find('EuiPopover[data-test-subj="queryBarMenuPopover"]').prop('isOpen');

        expect(isSavedQueryPopoverOpen()).toBeFalsy();

        wrapper.find('button[data-test-subj="showQueryBarMenu"]').simulate('click');

        await waitFor(() => {
          expect(isSavedQueryPopoverOpen()).toBeTruthy();
        });
        wrapper
          .find('button[data-test-subj="saved-query-management-save-button"]')
          .simulate('click');

        await waitFor(() => {
          expect(isSavedQueryPopoverOpen()).toBeTruthy();
        });
      });
    });
  });
});

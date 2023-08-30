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
import { TestProviders, mockIndexPattern } from '../../mock';
import { FilterManager } from '@kbn/data-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
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

    expect(searchBarProps).toMatchInlineSnapshot(`
      Object {
        "dataTestSubj": undefined,
        "dateRangeFrom": "now/d",
        "dateRangeTo": "now/d",
        "displayStyle": undefined,
        "filters": Array [],
        "indexPatterns": Array [
          DataView {
            "allowNoIndex": false,
            "deleteFieldFormat": [Function],
            "fieldAttrs": Object {},
            "fieldFormatMap": Object {},
            "fieldFormats": Object {},
            "fields": FldList [
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "@timestamp",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "date",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "@version",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.ephemeral_id",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.hostname",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.id",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test1",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test2",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test3",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test4",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test5",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test6",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test7",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "agent.test8",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": true,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "host.name",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": false,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "nestedField.firstAttributes",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
              Object {
                "aggregatable": false,
                "conflictDescriptions": undefined,
                "count": 0,
                "customLabel": undefined,
                "esTypes": undefined,
                "lang": undefined,
                "name": "nestedField.secondAttributes",
                "readFromDocValues": false,
                "script": undefined,
                "scripted": false,
                "searchable": true,
                "subType": undefined,
                "type": "string",
              },
            ],
            "flattenHit": [Function],
            "getFieldAttrs": [Function],
            "getIndexPattern": [Function],
            "getName": [Function],
            "getOriginalSavedObjectBody": [Function],
            "id": undefined,
            "matchedIndices": Array [],
            "metaFields": Array [],
            "name": "",
            "namespaces": Array [],
            "originalSavedObjectBody": Object {},
            "resetOriginalSavedObjectBody": [Function],
            "runtimeFieldMap": Object {},
            "setFieldFormat": [Function],
            "setIndexPattern": [Function],
            "shortDotsEnable": false,
            "sourceFilters": Array [],
            "timeFieldName": undefined,
            "title": "filebeat-*,auditbeat-*,packetbeat-*",
            "type": undefined,
            "typeMeta": undefined,
            "version": undefined,
          },
        ],
        "isDisabled": undefined,
        "isLoading": false,
        "isRefreshPaused": true,
        "query": Object {
          "language": "kuery",
          "query": "here: query",
        },
        "refreshInterval": undefined,
        "savedQuery": undefined,
        "showAutoRefreshOnly": false,
        "showDatePicker": false,
        "showFilterBar": true,
        "showQueryInput": true,
        "showSaveQuery": true,
        "showSubmitButton": false,
      }
    `);
  });

  // FLAKY: https://github.com/elastic/kibana/issues/132659
  describe.skip('#onQuerySubmit', () => {
    test(' is the only reference that changed when filterQuery props get updated', async () => {
      await act(async () => {
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
    test('is only reference that changed when dataProviders props get updated', async () => {
      await act(async () => {
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
  });

  describe('SavedQueryManagementComponent state', () => {
    test('popover should remain open when "Save current query" button was clicked', async () => {
      await act(async () => {
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

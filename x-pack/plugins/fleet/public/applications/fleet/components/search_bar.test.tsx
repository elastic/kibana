/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { FieldSpec } from '@kbn/data-plugin/common';

import { createFleetTestRendererMock } from '../../../mock';

import { SearchBar, filterAndConvertFields } from './search_bar';

const fields = [
  {
    name: '_id',
    type: 'string',
    esTypes: ['_id'],
  },
  {
    name: 'api_key',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'name',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'version',
    type: 'string',
    esTypes: ['keyword'],
  },
] as FieldSpec[];

const allFields = [
  {
    name: 'test-index._id',
    type: 'string',
    esTypes: ['_id'],
  },
  {
    name: 'test-index.api_key',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'test-index.name',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'another-index.version',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'test2-index.name',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'fleet-agents.actions',
    type: 'string',
    esTypes: ['keyword'],
  },
] as FieldSpec[];

jest.mock('../hooks', () => {
  return {
    ...jest.requireActual('../hooks'),
    useStartServices: jest.fn().mockReturnValue({
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
        },
      },
      http: {
        basePath: {
          get: () => 'http://localhost:5620',
          prepend: (url: string) => 'http://localhost:5620' + url,
        },
      },
      data: {
        dataViews: {
          getFieldsForWildcard: jest.fn().mockResolvedValue([
            {
              name: '_id',
              type: 'string',
              esTypes: ['_id'],
            },
            {
              name: 'api_key',
              type: 'string',
              esTypes: ['keyword'],
            },
            {
              name: 'name',
              type: 'string',
              esTypes: ['keyword'],
            },
          ]),
          create: jest.fn().mockResolvedValue({
            fields,
          }),
        },
      },
      unifiedSearch: {
        autocomplete: {
          getQuerySuggestions: jest.fn().mockResolvedValue([
            {
              type: 'field',
              field: {
                name: '_id',
                spec: {
                  type: 'string',
                  esTypes: ['_id'],
                },
              },
            },
            {
              type: 'api_key',
              field: {
                name: 'api_key',
                spec: {
                  type: 'string',
                  esTypes: ['api_key'],
                },
              },
            },
            {
              type: 'name',
              field: {
                name: 'name',
                spec: {
                  type: 'string',
                  esTypes: ['name'],
                },
              },
            },
            {
              type: 'version',
              field: {
                name: 'version',
                spec: {
                  type: 'string',
                  esTypes: ['version'],
                },
              },
            },
          ]),
        },
        ui: {
          IndexPatternSelect: jest.fn(),
          SearchBar: jest.fn().mockReturnValue(null),
          AggregateQuerySearchBar: jest.fn().mockReturnValue(null),
          FiltersBuilderLazy: jest.fn(),
        },
      },
      storage: {
        storage: {
          clear: jest.fn(),
          getItem: jest.fn(),
          key: jest.fn(),
          removeItem: jest.fn(),
          setItem: jest.fn(),
          length: 0,
        },
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
      },
      docLinks: {},
      uiSettings: {
        get: jest.fn(),
      },
      usageCollection: { reportUiCounter: () => {} },
      appName: 'test',
    }),
  };
});

describe('SearchBar', () => {
  const testRenderer = createFleetTestRendererMock();
  const result = testRenderer.render(
    <SearchBar
      value="test-index.name: test"
      onChange={() => undefined}
      fieldPrefix="test-index"
      indexPattern=".test-index"
    />
  );

  it('renders the search box', async () => {
    const textArea = result.queryByTestId('queryInput');
    expect(textArea).not.toBeNull();
    expect(textArea?.getAttribute('placeholder')).toEqual('Filter your data using KQL syntax');
    expect(textArea?.getAttribute('aria-label')).toEqual(
      'Start typing to search and filter the Fleet page'
    );
    expect(result?.getByText('test-index.name: test')).toBeInTheDocument();
  });
});

describe('filterAndConvertFields', () => {
  it('leaves the fields names unchanged and does not hide any fields if fieldPrefix is not passed', async () => {
    expect(filterAndConvertFields(fields, '.test-index')).toEqual({
      _id: { esTypes: ['_id'], name: '_id', type: 'string' },
      api_key: { esTypes: ['keyword'], name: 'api_key', type: 'string' },
      name: { esTypes: ['keyword'], name: 'name', type: 'string' },
      version: { esTypes: ['keyword'], name: 'version', type: 'string' },
    });
  });

  it('filters out the fields from other indices if indexPattern === .kibana-ingest', async () => {
    expect(filterAndConvertFields(allFields, '.kibana_ingest', 'test-index')).toEqual({
      'test-index._id': { esTypes: ['_id'], name: 'test-index._id', type: 'string' },
      'test-index.api_key': { esTypes: ['keyword'], name: 'test-index.api_key', type: 'string' },
      'test-index.name': { esTypes: ['keyword'], name: 'test-index.name', type: 'string' },
    });
  });

  it('returns fields unchanged if fieldPrefix and indexPattern are not passed', async () => {
    expect(filterAndConvertFields(allFields, undefined, undefined)).toEqual({
      'another-index.version': {
        esTypes: ['keyword'],
        name: 'another-index.version',
        type: 'string',
      },
      'fleet-agents.actions': {
        esTypes: ['keyword'],
        name: 'fleet-agents.actions',
        type: 'string',
      },
      'test-index._id': {
        esTypes: ['_id'],
        name: 'test-index._id',
        type: 'string',
      },
      'test-index.api_key': {
        esTypes: ['keyword'],
        name: 'test-index.api_key',
        type: 'string',
      },
      'test-index.name': {
        esTypes: ['keyword'],
        name: 'test-index.name',
        type: 'string',
      },
      'test2-index.name': {
        esTypes: ['keyword'],
        name: 'test2-index.name',
        type: 'string',
      },
    });
  });

  it('returns empty object if fields is empty', async () => {
    expect(filterAndConvertFields([], '.kibana_ingest', 'test-index')).toEqual({});
  });
});

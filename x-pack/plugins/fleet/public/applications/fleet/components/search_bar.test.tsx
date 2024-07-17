/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import type { FieldSpec } from '@kbn/data-plugin/common';

import { createFleetTestRendererMock } from '../../../mock';

import {
  AGENTS_PREFIX,
  FLEET_ENROLLMENT_API_PREFIX,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
  INGEST_SAVED_OBJECT_INDEX,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../constants';

import { SearchBar, getFieldSpecs } from './search_bar';

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
    await act(async () => {
      result.queryByTestId('queryInput');
    });
    const textArea = result.queryByTestId('queryInput');
    expect(textArea).not.toBeNull();
    expect(textArea?.getAttribute('placeholder')).toEqual('Filter your data using KQL syntax');
    expect(textArea?.getAttribute('aria-label')).toEqual(
      'Start typing to search and filter the Fleet page'
    );
    expect(result?.getByText('test-index.name: test')).toBeInTheDocument();
  });
});

describe('getFieldSpecs', () => {
  it('returns fieldSpecs for Fleet agents', () => {
    expect(getFieldSpecs(AGENTS_INDEX, AGENTS_PREFIX)).toHaveLength(73);
  });

  it('returns fieldSpecs for Fleet enrollment tokens', () => {
    expect(getFieldSpecs(ENROLLMENT_API_KEYS_INDEX, FLEET_ENROLLMENT_API_PREFIX)).toEqual([
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'active',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'api_key',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'api_key_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'created_at',
        searchable: true,
        type: 'date',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'expire_at',
        searchable: true,
        type: 'date',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'name',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'policy_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'updated_at',
        searchable: true,
        type: 'date',
      },
    ]);
  });

  it('returns fieldSpecs for Fleet agent policies', () => {
    expect(getFieldSpecs(INGEST_SAVED_OBJECT_INDEX, AGENT_POLICY_SAVED_OBJECT_TYPE)).toEqual([
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.agent_features.name',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'ingest-agent-policies.agent_features.enabled',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.data_output_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['text'],
        name: 'ingest-agent-policies.description',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.download_source_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.fleet_server_host_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['integer'],
        name: 'ingest-agent-policies.inactivity_timeout',
        searchable: true,
        type: 'number',
      },
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'ingest-agent-policies.is_default',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'ingest-agent-policies.is_default_fleet_server',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'ingest-agent-policies.is_managed',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.is_preconfigured',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'ingest-agent-policies.is_protected',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.monitoring_enabled',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['false'],
        name: 'ingest-agent-policies.monitoring_enabled.index',
        searchable: true,
        type: 'false',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.monitoring_output_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.name',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.namespace',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['integer'],
        name: 'ingest-agent-policies.revision',
        searchable: true,
        type: 'number',
      },
      {
        aggregatable: true,
        esTypes: ['version'],
        name: 'ingest-agent-policies.schema_version',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.status',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['integer'],
        name: 'ingest-agent-policies.unenroll_timeout',
        searchable: true,
        type: 'number',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'ingest-agent-policies.updated_at',
        searchable: true,
        type: 'date',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'ingest-agent-policies.updated_by',
        searchable: true,
        type: 'string',
      },
    ]);
  });

  it('returns empty array if indexPattern is not one of the previous', async () => {
    expect(getFieldSpecs(INGEST_SAVED_OBJECT_INDEX, PACKAGE_POLICY_SAVED_OBJECT_TYPE)).toEqual([]);
  });
});

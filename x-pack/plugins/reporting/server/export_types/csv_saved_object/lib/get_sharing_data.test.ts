/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from 'src/core/server/mocks';
import type { DataView, SearchSource } from 'src/plugins/data/common';
import { stubIndexPattern, stubIndexPatternWithoutTimeField } from 'src/plugins/data/common/stubs';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from 'src/plugins/discover/common';
import type { VisualizationSavedObjectAttributes } from 'src/plugins/visualizations/common';
import type { SavedSearchObjectType } from './get_sharing_data';
import { getSharingData } from './get_sharing_data';

const createMockSearchSource = () =>
  ({
    createCopy: jest.fn().mockReturnThis(),
    setField: jest.fn().mockReturnThis(),
    removeField: jest.fn().mockReturnThis(),
    getSerializedFields: jest.fn(),
  } as unknown as SearchSource);
const createMockIndexPattern = () => stubIndexPattern;
const createMockIndexPatternWithoutTimeField = () => stubIndexPatternWithoutTimeField;

describe('get_sharing_data', () => {
  let mockIndexPattern: DataView;
  let mockSearchSource: SearchSource;
  let mockSavedSearch: SavedSearchObjectType;

  const coreStart = coreMock.createStart();
  const request = httpServerMock.createKibanaRequest();
  const soClient = coreStart.savedObjects.getScopedClient(request);
  const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
  const fooFn = async (settingName: string) => {
    if (settingName === DOC_HIDE_TIME_COLUMN_SETTING || settingName === SEARCH_FIELDS_FROM_SOURCE) {
      return false as any;
    }
    throw new Error('not an expected settingName: ' + settingName);
  };
  uiSettings.get = jest.fn(fooFn);

  beforeEach(() => {
    mockSavedSearch = {
      id: '9747bd90-8581-11ed-97c5-596122858f69',
      type: 'search',
      namespaces: ['default'],
      updated_at: '2022-12-28T23:19:23.982Z',
      version: 'WzI1LDFd',
      attributes: {
        columns: ['clientip', 'extension'],
        description: '',
        grid: {},
        hideChart: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
        sort: [['@timestamp', 'desc']],
        title: 'A Saved Search',
      } as unknown as VisualizationSavedObjectAttributes & {
        columns?: string[] | undefined;
        sort: Array<[string, string]>;
      },
      references: [
        {
          id: 'logstash-*',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        },
      ],
      migrationVersion: { search: '7.9.3' },
      coreMigrationVersion: '7.17.9',
    };
    mockSearchSource = createMockSearchSource();
    mockSearchSource.getField = jest.fn((fieldName: string) => {
      if (fieldName === 'index') {
        return mockIndexPattern;
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('transforms saved search into search source using columns with automatic time field', async () => {
    mockIndexPattern = createMockIndexPattern();
    const sharingData = await getSharingData({ uiSettings }, mockSearchSource, mockSavedSearch);
    expect(sharingData.columns).toMatchInlineSnapshot(`
      Array [
        "@timestamp",
        "clientip",
        "extension",
      ]
    `);
    expect(mockSearchSource.setField).toBeCalledTimes(2);
    expect(mockSearchSource.setField).toHaveBeenNthCalledWith(1, 'sort', [
      { '@timestamp': 'desc' },
    ]);
    expect(mockSearchSource.setField).toHaveBeenNthCalledWith(2, 'fields', [
      '@timestamp',
      'clientip',
      'extension',
    ]);
  });

  it('transforms saved search into search source with automatic time field and with no columns', async () => {
    mockIndexPattern = createMockIndexPattern();
    mockSavedSearch.attributes.columns = [];
    const sharingData = await getSharingData({ uiSettings }, mockSearchSource, mockSavedSearch);
    expect(sharingData.columns).toBe(undefined);
    expect(mockSearchSource.setField).toBeCalledTimes(2);
    expect(mockSearchSource.setField).toHaveBeenNthCalledWith(1, 'sort', [
      { '@timestamp': 'desc' },
    ]);
    expect(mockSearchSource.setField).toHaveBeenNthCalledWith(2, 'fields', ['*']);
  });

  it('transforms saved search into search source using columns without time field', async () => {
    mockIndexPattern = createMockIndexPatternWithoutTimeField();
    mockSavedSearch.attributes.sort = [];
    const sharingData = await getSharingData({ uiSettings }, mockSearchSource, mockSavedSearch);
    expect(sharingData.columns).toMatchInlineSnapshot(`
      Array [
        "clientip",
        "extension",
      ]
    `);
    expect(mockSearchSource.setField).toBeCalledTimes(2);
    expect(mockSearchSource.setField).toHaveBeenNthCalledWith(1, 'sort', [{ _score: 'desc' }]);
    expect(mockSearchSource.setField).toHaveBeenNthCalledWith(2, 'fields', [
      'clientip',
      'extension',
    ]);
  });
});

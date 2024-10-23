/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { getESQLResults } from '@kbn/esql-utils';
import type { LensPluginStartDependencies } from '../../../plugin';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import {
  mockVisualizationMap,
  mockDatasourceMap,
  mockDataViewWithTimefield,
  mockAllSuggestions,
} from '../../../mocks';
import { suggestionsApi } from '../../../lens_suggestions_api';
import { getSuggestions } from './helpers';

const mockSuggestionApi = suggestionsApi as jest.Mock;
const mockFetchData = getESQLResults as jest.Mock;

jest.mock('../../../lens_suggestions_api', () => ({
  suggestionsApi: jest.fn(() => mockAllSuggestions),
}));

jest.mock('@kbn/esql-utils', () => {
  return {
    getESQLResults: jest.fn().mockResolvedValue({
      response: {
        columns: [
          {
            name: '@timestamp',
            id: '@timestamp',
            meta: {
              type: 'date',
            },
          },
          {
            name: 'bytes',
            id: 'bytes',
            meta: {
              type: 'number',
            },
          },
          {
            name: 'memory',
            id: 'memory',
            meta: {
              type: 'number',
            },
          },
        ],
        values: [],
      },
    }),
    getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('index1'),
    getESQLAdHocDataview: jest.fn().mockResolvedValue({}),
    formatESQLColumns: jest.fn().mockReturnValue([
      {
        name: '@timestamp',
        id: '@timestamp',
        meta: {
          type: 'date',
        },
      },
      {
        name: 'bytes',
        id: 'bytes',
        meta: {
          type: 'number',
        },
      },
      {
        name: 'memory',
        id: 'memory',
        meta: {
          type: 'number',
        },
      },
    ]),
  };
});

describe('getSuggestions', () => {
  const query = {
    esql: 'from index1 | limit 10 | stats average = avg(bytes)',
  };
  const mockStartDependencies =
    createMockStartDependencies() as unknown as LensPluginStartDependencies;
  const dataViews = dataViewPluginMocks.createStartContract();
  dataViews.create.mockResolvedValue(mockDataViewWithTimefield);
  const dataviewSpecArr = [
    {
      id: 'd2588ae7-9ea0-4439-9f5b-f808754a3b97',
      title: 'index1',
      timeFieldName: '@timestamp',
      sourceFilters: [],
      fieldFormats: {},
      runtimeFieldMap: {},
      fieldAttrs: {},
      allowNoIndex: false,
      name: 'index1',
    },
  ];
  const startDependencies = {
    ...mockStartDependencies,
    dataViews,
  };

  it('returns the suggestions attributes correctly', async () => {
    const suggestionsAttributes = await getSuggestions(
      query,
      startDependencies,
      mockDatasourceMap(),
      mockVisualizationMap(),
      dataviewSpecArr,
      jest.fn()
    );
    expect(suggestionsAttributes?.visualizationType).toBe(mockAllSuggestions[0].visualizationId);
    expect(suggestionsAttributes?.state.visualization).toStrictEqual(
      mockAllSuggestions[0].visualizationState
    );
  });

  it('returns undefined if no suggestions are computed', async () => {
    mockSuggestionApi.mockResolvedValueOnce([]);
    const suggestionsAttributes = await getSuggestions(
      query,
      startDependencies,
      mockDatasourceMap(),
      mockVisualizationMap(),
      dataviewSpecArr,
      jest.fn()
    );
    expect(suggestionsAttributes).toBeUndefined();
  });

  it('returns an error if fetching the data fails', async () => {
    mockFetchData.mockImplementation(() => {
      throw new Error('sorry!');
    });
    const setErrorsSpy = jest.fn();
    const suggestionsAttributes = await getSuggestions(
      query,
      startDependencies,
      mockDatasourceMap(),
      mockVisualizationMap(),
      dataviewSpecArr,
      setErrorsSpy
    );
    expect(suggestionsAttributes).toBeUndefined();
    expect(setErrorsSpy).toHaveBeenCalled();
  });
});

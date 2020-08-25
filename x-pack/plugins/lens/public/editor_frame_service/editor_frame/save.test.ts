/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSavedObjectFormat, Props } from './save';
import { createMockDatasource, createMockVisualization } from '../mocks';
import { esFilters, IIndexPattern, IFieldType } from '../../../../../../src/plugins/data/public';

jest.mock('./expression_helpers');

describe('save editor frame state', () => {
  const mockVisualization = createMockVisualization();
  const mockDatasource = createMockDatasource('a');
  const mockIndexPattern = ({ id: 'indexpattern' } as unknown) as IIndexPattern;
  const mockField = ({ name: '@timestamp' } as unknown) as IFieldType;

  mockDatasource.getPersistableState.mockImplementation((x) => ({
    state: x,
    savedObjectReferences: [],
  }));
  const saveArgs: Props = {
    activeDatasources: {
      indexpattern: mockDatasource,
    },
    visualization: mockVisualization,
    state: {
      title: 'aaa',
      datasourceStates: {
        indexpattern: {
          state: 'hello',
          isLoading: false,
        },
      },
      activeDatasourceId: 'indexpattern',
      visualization: { activeId: '2', state: {} },
    },
    framePublicAPI: {
      addNewLayer: jest.fn(),
      removeLayers: jest.fn(),
      datasourceLayers: {
        first: mockDatasource.publicAPIMock,
      },
      query: { query: '', language: 'lucene' },
      dateRange: { fromDate: 'now-7d', toDate: 'now' },
      filters: [esFilters.buildExistsFilter(mockField, mockIndexPattern)],
    },
  };

  it('transforms from internal state to persisted doc format', async () => {
    const datasource = createMockDatasource('a');
    datasource.getPersistableState.mockImplementation((state) => ({
      state: {
        stuff: `${state}_datasource_persisted`,
      },
      savedObjectReferences: [],
    }));
    datasource.toExpression.mockReturnValue('my | expr');

    const visualization = createMockVisualization();
    visualization.toExpression.mockReturnValue('vis | expr');

    const { doc, filterableIndexPatterns, isSaveable } = await getSavedObjectFormat({
      ...saveArgs,
      activeDatasources: {
        indexpattern: datasource,
      },
      state: {
        title: 'bbb',
        datasourceStates: {
          indexpattern: {
            state: '2',
            isLoading: false,
          },
        },
        activeDatasourceId: 'indexpattern',
        visualization: { activeId: '3', state: '4' },
      },
      visualization,
    });

    expect(filterableIndexPatterns).toEqual([]);
    expect(isSaveable).toEqual(true);
    expect(doc).toEqual({
      id: undefined,
      state: {
        datasourceStates: {
          indexpattern: {
            stuff: '2_datasource_persisted',
          },
        },
        visualization: '4',
        query: { query: '', language: 'lucene' },
        filters: [
          {
            meta: { indexRefName: 'filter-index-pattern-0' },
            exists: { field: '@timestamp' },
          },
        ],
      },
      references: [
        {
          id: 'indexpattern',
          name: 'filter-index-pattern-0',
          type: 'index-pattern',
        },
      ],
      title: 'bbb',
      type: 'lens',
      visualizationType: '3',
    });
  });
});

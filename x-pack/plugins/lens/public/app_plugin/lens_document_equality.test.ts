/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, FilterStateStore } from '@kbn/es-query';
import { isLensEqual } from './lens_document_equality';
import { Document } from '../persistence/saved_object_store';
import { Datasource, DatasourceMap } from '../types';

const defaultDoc: Document = {
  title: 'some-title',
  visualizationType: 'lnsXY',
  state: {
    query: {
      query: '',
      language: 'kuery',
    },
    visualization: {
      some: 'props',
    },
    datasourceStates: {
      indexpattern: {},
    },
    filters: [
      {
        meta: {
          index: 'reference-1',
        },
      },
    ],
  },
  references: [
    {
      name: 'reference-1',
      id: 'id-1',
      type: 'index-pattern',
    },
  ],
};

describe('lens document equality', () => {
  const mockInjectFilterReferences = jest.fn((filters: Filter[]) =>
    filters.map((filter) => ({
      ...filter,
      meta: {
        ...filter.meta,
        index: 'injected!',
      },
    }))
  );

  let mockDatasourceMap: DatasourceMap;

  beforeEach(() => {
    mockDatasourceMap = {
      indexpattern: { isEqual: jest.fn(() => true) },
    } as unknown as DatasourceMap;
  });

  it('returns true when documents are equal', () => {
    expect(
      isLensEqual(defaultDoc, defaultDoc, mockInjectFilterReferences, mockDatasourceMap)
    ).toBeTruthy();
  });

  it('handles undefined documents', () => {
    expect(isLensEqual(undefined, undefined, mockInjectFilterReferences, {})).toBeTruthy();
    expect(isLensEqual(undefined, {} as Document, mockInjectFilterReferences, {})).toBeFalsy();
    expect(isLensEqual({} as Document, undefined, mockInjectFilterReferences, {})).toBeFalsy();
  });

  it('should compare visualization type', () => {
    expect(
      isLensEqual(
        defaultDoc,
        { ...defaultDoc, visualizationType: 'other-type' },
        mockInjectFilterReferences,
        mockDatasourceMap
      )
    ).toBeFalsy();
  });

  it('should compare the query', () => {
    expect(
      isLensEqual(
        defaultDoc,
        {
          ...defaultDoc,
          state: {
            ...defaultDoc.state,
            query: {
              query: 'foobar',
              language: 'kuery',
            },
          },
        },
        mockInjectFilterReferences,
        mockDatasourceMap
      )
    ).toBeFalsy();
  });

  it('should compare the visualization state', () => {
    expect(
      isLensEqual(
        defaultDoc,
        {
          ...defaultDoc,
          state: {
            ...defaultDoc.state,
            visualization: {
              some: 'other-props',
            },
          },
        },
        mockInjectFilterReferences,
        mockDatasourceMap
      )
    ).toBeFalsy();
  });

  describe('comparing the datasources', () => {
    it('checks available datasources', () => {
      // add an extra datasource in one doc
      expect(
        isLensEqual(
          defaultDoc,
          {
            ...defaultDoc,
            state: {
              ...defaultDoc.state,
              datasourceStates: {
                ...defaultDoc.state.datasourceStates,
                foodatasource: {},
              },
            },
          },
          mockInjectFilterReferences,
          { ...mockDatasourceMap, foodatasource: { isEqual: () => true } as unknown as Datasource }
        )
      ).toBeFalsy();

      // ordering of the datasource states shouldn't matter
      expect(
        isLensEqual(
          {
            ...defaultDoc,
            state: {
              ...defaultDoc.state,
              datasourceStates: {
                foodatasource: {}, // first
                ...defaultDoc.state.datasourceStates,
              },
            },
          },
          {
            ...defaultDoc,
            state: {
              ...defaultDoc.state,
              datasourceStates: {
                ...defaultDoc.state.datasourceStates,
                foodatasource: {}, // last
              },
            },
          },
          mockInjectFilterReferences,
          { ...mockDatasourceMap, foodatasource: { isEqual: () => true } as unknown as Datasource }
        )
      ).toBeTruthy();
    });

    it('delegates internal datasource comparison', () => {
      // datasource's isEqual returns false
      (mockDatasourceMap.indexpattern.isEqual as jest.Mock).mockReturnValue(false);
      expect(
        isLensEqual(defaultDoc, defaultDoc, mockInjectFilterReferences, mockDatasourceMap)
      ).toBeFalsy();
    });
  });

  it('should ignore pinned filters', () => {
    // ignores pinned filters
    const pinnedFilter: Filter = {
      $state: {
        store: FilterStateStore.GLOBAL_STATE,
      },
      meta: {},
    };

    const filtersWithPinned = [...defaultDoc.state.filters, pinnedFilter];

    expect(
      isLensEqual(
        defaultDoc,
        { ...defaultDoc, state: { ...defaultDoc.state, filters: filtersWithPinned } },
        mockInjectFilterReferences,
        mockDatasourceMap
      )
    ).toBeTruthy();
  });

  it('should inject filter references', () => {
    // injects filter references for comparison
    expect(
      isLensEqual(
        defaultDoc,
        {
          ...defaultDoc,
          state: {
            ...defaultDoc.state,
            filters: [
              {
                meta: {
                  index: 'some-other-reference-name',
                },
              },
            ],
          },
        },
        mockInjectFilterReferences,
        mockDatasourceMap
      )
    ).toBeTruthy();
  });

  it('should consider undefined props equivalent to non-existant props', () => {
    expect(
      isLensEqual(
        defaultDoc,
        {
          ...defaultDoc,
          state: {
            ...defaultDoc.state,
            visualization: {
              ...(defaultDoc.state.visualization as object),
              foo: undefined,
            },
          },
        },
        mockInjectFilterReferences,
        mockDatasourceMap
      )
    ).toBeTruthy();
  });
});

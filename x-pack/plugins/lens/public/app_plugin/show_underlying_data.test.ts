/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockDatasource } from '../mocks';
import { combineQueryAndFilters, getLayerMetaInfo } from './show_underlying_data';
import { Filter } from '@kbn/es-query';
import { DatasourcePublicAPI } from '../types';

describe('getLayerMetaInfo', () => {
  const capabilities = {
    navLinks: { discover: true },
    discover: { show: true },
  };
  it('should return error in case of no data', () => {
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        {},
        undefined,
        {},
        undefined,
        capabilities
      ).error
    ).toBe('Visualization has no data available to show');
  });

  it('should return error in case of multiple layers', () => {
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        {},
        {
          datatable1: { type: 'datatable', columns: [], rows: [] },
          datatable2: { type: 'datatable', columns: [], rows: [] },
        },
        {},
        undefined,
        capabilities
      ).error
    ).toBe('Cannot show underlying data for visualizations with multiple layers');
  });

  it('should return error in case of missing activeDatasource', () => {
    expect(getLayerMetaInfo(undefined, {}, undefined, {}, undefined, capabilities).error).toBe(
      'Visualization has no data available to show'
    );
  });

  it('should return error in case of missing configuration/state', () => {
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        undefined,
        {},
        {},
        undefined,
        capabilities
      ).error
    ).toBe('Visualization has no data available to show');
  });

  it('should return error in case of a timeshift declared in a column', () => {
    const mockDatasource = createMockDatasource('testDatasource');
    const updatedPublicAPI: DatasourcePublicAPI = {
      datasourceId: 'testDatasource',
      getOperationForColumnId: jest.fn(() => ({
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
        label: 'A field',
        isStaticValue: false,
        sortingHint: undefined,
        hasTimeShift: true,
      })),
      getTableSpec: jest.fn(),
      getVisualDefaults: jest.fn(),
      getSourceId: jest.fn(),
      getMaxPossibleNumValues: jest.fn(),
      getFilters: jest.fn(),
    };
    mockDatasource.getPublicAPI.mockReturnValue(updatedPublicAPI);
    expect(
      getLayerMetaInfo(createMockDatasource('testDatasource'), {}, {}, {}, undefined, capabilities)
        .error
    ).toBe('Visualization has no data available to show');
  });

  it('should return error in case of getFilters returning errors', () => {
    const mockDatasource = createMockDatasource('testDatasource');
    const updatedPublicAPI: DatasourcePublicAPI = {
      datasourceId: 'indexpattern',
      getOperationForColumnId: jest.fn(),
      getTableSpec: jest.fn(() => [{ columnId: 'col1', fields: ['bytes'] }]),
      getVisualDefaults: jest.fn(),
      getSourceId: jest.fn(),
      getMaxPossibleNumValues: jest.fn(),
      getFilters: jest.fn(() => ({ error: 'filters error' })),
    };
    mockDatasource.getPublicAPI.mockReturnValue(updatedPublicAPI);
    expect(
      getLayerMetaInfo(
        mockDatasource,
        {}, // the publicAPI has been mocked, so no need for a state here
        {
          datatable1: { type: 'datatable', columns: [], rows: [] },
        },
        {},
        undefined,
        capabilities
      ).error
    ).toBe('filters error');
  });

  it('should not be visible if discover is not available', () => {
    // both capabilities should be enabled to enable discover
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        {},
        {
          datatable1: { type: 'datatable', columns: [], rows: [] },
        },
        {},
        undefined,
        {
          navLinks: { discover: false },
          discover: { show: true },
        }
      ).isVisible
    ).toBeFalsy();
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        {},
        {
          datatable1: { type: 'datatable', columns: [], rows: [] },
        },
        {},
        undefined,
        {
          navLinks: { discover: true },
          discover: { show: false },
        }
      ).isVisible
    ).toBeFalsy();
  });

  it('should basically work collecting fields and filters in the visualization', () => {
    const mockDatasource = createMockDatasource('testDatasource');
    const updatedPublicAPI: DatasourcePublicAPI = {
      datasourceId: 'indexpattern',
      getOperationForColumnId: jest.fn(),
      getTableSpec: jest.fn(() => [{ columnId: 'col1', fields: ['bytes'] }]),
      getVisualDefaults: jest.fn(),
      getSourceId: jest.fn(),
      getMaxPossibleNumValues: jest.fn(),
      getFilters: jest.fn(() => ({
        enabled: {
          kuery: [[{ language: 'kuery', query: 'memory > 40000' }]],
          lucene: [],
        },
        disabled: { kuery: [], lucene: [] },
      })),
    };
    mockDatasource.getPublicAPI.mockReturnValue(updatedPublicAPI);
    const { error, meta } = getLayerMetaInfo(
      mockDatasource,
      {}, // the publicAPI has been mocked, so no need for a state here
      {
        datatable1: { type: 'datatable', columns: [], rows: [] },
      },
      {},
      undefined,
      capabilities
    );
    expect(error).toBeUndefined();
    expect(meta?.columns).toEqual(['bytes']);
    expect(meta?.filters).toEqual({
      enabled: {
        kuery: [
          [
            {
              language: 'kuery',
              query: 'memory > 40000',
            },
          ],
        ],
        lucene: [],
      },
      disabled: { kuery: [], lucene: [] },
    });
  });
});
describe('combineQueryAndFilters', () => {
  it('should just return same query and filters if no fields or filters are in layer meta', () => {
    expect(
      combineQueryAndFilters(
        { language: 'kuery', query: 'myfield: *' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: { enabled: { kuery: [], lucene: [] }, disabled: { kuery: [], lucene: [] } },
        },
        undefined,
        {}
      )
    ).toEqual({ query: { language: 'kuery', query: 'myfield: *' }, filters: [] });
  });

  it('should concatenate filters with existing query if languages match (AND it)', () => {
    expect(
      combineQueryAndFilters(
        { language: 'kuery', query: 'myfield: *' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: { kuery: [[{ language: 'kuery', query: 'otherField: *' }]], lucene: [] },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      query: { language: 'kuery', query: '( ( myfield: * ) AND ( otherField: * ) )' },
      filters: [],
    });
  });

  it('should build single kuery expression from meta filters and assign it as query for final use', () => {
    expect(
      combineQueryAndFilters(
        undefined,
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: { kuery: [[{ language: 'kuery', query: 'otherField: *' }]], lucene: [] },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({ query: { language: 'kuery', query: 'otherField: *' }, filters: [] });
  });

  it('should build single kuery expression from meta filters and join using OR and AND at the right level', () => {
    // OR queries from the same array, AND queries from different arrays
    expect(
      combineQueryAndFilters(
        undefined,
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [
                [
                  { language: 'kuery', query: 'myfield: *' },
                  { language: 'kuery', query: 'otherField: *' },
                ],
                [
                  { language: 'kuery', query: 'myfieldCopy: *' },
                  { language: 'kuery', query: 'otherFieldCopy: *' },
                ],
              ],
              lucene: [],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      query: {
        language: 'kuery',
        query:
          '( ( ( myfield: * ) OR ( otherField: * ) ) AND ( ( myfieldCopy: * ) OR ( otherFieldCopy: * ) ) )',
      },
      filters: [],
    });
  });

  it('should assign kuery meta filters to app filters if existing query is using lucene language', () => {
    expect(
      combineQueryAndFilters(
        { language: 'lucene', query: 'myField' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [[{ language: 'kuery', query: 'myfield: *' }]],
              lucene: [],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      query: { language: 'lucene', query: 'myField' },
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Lens context (kuery)',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
    });
  });

  it('should append lucene meta filters to app filters even if existing filters are using kuery', () => {
    expect(
      combineQueryAndFilters(
        { language: 'kuery', query: 'myField: *' },
        [
          {
            $state: {
              store: 'appState',
            },
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        exists: {
                          field: 'myfield',
                        },
                      },
                    ],
                  },
                },
              ],
              must: [],
              must_not: [],
              should: [],
            },
            meta: {
              alias: 'Existing kuery filters',
              disabled: false,
              index: 'testDatasource',
              negate: false,
              type: 'custom',
            },
          } as Filter,
        ],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [],
              lucene: [[{ language: 'lucene', query: 'anotherField' }]],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Existing kuery filters',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [],
            must: [
              {
                query_string: {
                  query: 'anotherField',
                },
              },
            ],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Lens context (lucene)',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
      query: {
        language: 'kuery',
        query: 'myField: *',
      },
    });
  });

  it('should append lucene meta filters to an existing lucene query', () => {
    expect(
      combineQueryAndFilters(
        { language: 'lucene', query: 'myField' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [[{ language: 'kuery', query: 'myfield: *' }]],
              lucene: [[{ language: 'lucene', query: 'anotherField' }]],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Lens context (kuery)',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
      query: {
        language: 'lucene',
        query: '( ( myField ) AND ( anotherField ) )',
      },
    });
  });

  it('should accept multiple queries (and play nice with meta filters)', () => {
    const { query, filters } = combineQueryAndFilters(
      [
        { language: 'lucene', query: 'myFirstField' },
        { language: 'lucene', query: 'mySecondField' },
        { language: 'kuery', query: 'myThirdField : *' },
      ],
      [],
      {
        id: 'testDatasource',
        columns: [],
        filters: {
          enabled: {
            kuery: [[{ language: 'kuery', query: 'myFourthField : *' }]],
            lucene: [[{ language: 'lucene', query: 'myFifthField' }]],
          },
          disabled: { kuery: [], lucene: [] },
        },
      },
      undefined,
      {}
    );

    expect(query).toEqual({
      language: 'lucene',
      query: '( ( myFirstField ) AND ( mySecondField ) AND ( myFifthField ) )',
    });

    expect(filters).toEqual([
      {
        $state: {
          store: 'appState',
        },
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          exists: {
                            field: 'myThirdField',
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          exists: {
                            field: 'myFourthField',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
        meta: {
          alias: 'Lens context (kuery)',
          disabled: false,
          index: 'testDatasource',
          negate: false,
          type: 'custom',
        },
      },
    ]);
  });

  it('should ignore all empty queries', () => {
    const emptyQueryAndFilters = {
      filters: [],
      query: {
        language: 'kuery',
        query: '',
      },
    };

    expect(
      combineQueryAndFilters(
        [{ language: 'lucene', query: '' }],
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [[{ language: 'kuery', query: '' }]],
              lucene: [],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual(emptyQueryAndFilters);

    expect(
      combineQueryAndFilters(
        { language: 'lucene', query: '' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [[{ language: 'kuery', query: '' }]],
              lucene: [],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual(emptyQueryAndFilters);

    expect(
      combineQueryAndFilters(
        undefined,
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [[{ language: 'kuery', query: '' }]],
              lucene: [],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual(emptyQueryAndFilters);
  });

  it('should work for complex cases of nested meta filters', () => {
    // scenario overview:
    // A kuery query
    // A kuery filter pill
    // 4 kuery table filter groups (1 from filtered column, 2 from filters, 1 from top values, 1 from custom ranges)
    // 2 lucene table filter groups (1 from filtered column + 2 from filters )
    expect(
      combineQueryAndFilters(
        { language: 'kuery', query: 'myField: *' },
        [
          {
            $state: {
              store: 'appState',
            },
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        exists: {
                          field: 'myfield',
                        },
                      },
                    ],
                  },
                },
              ],
              must: [],
              must_not: [],
              should: [],
            },
            meta: {
              alias: 'Existing kuery filters',
              disabled: false,
              index: 'testDatasource',
              negate: false,
              type: 'custom',
            },
          } as Filter,
        ],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            enabled: {
              kuery: [
                [{ language: 'kuery', query: 'bytes > 4000' }],
                [
                  { language: 'kuery', query: 'memory > 5000' },
                  { language: 'kuery', query: 'memory >= 15000' },
                ],
                [{ language: 'kuery', query: 'myField: *' }],
                [{ language: 'kuery', query: 'otherField >= 15' }],
              ],
              lucene: [
                [{ language: 'lucene', query: 'filteredField: 400' }],
                [
                  { language: 'lucene', query: 'aNewField' },
                  { language: 'lucene', query: 'anotherNewField: 200' },
                ],
              ],
            },
            disabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Existing kuery filters',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [],
            must: [
              {
                query_string: {
                  query:
                    '( ( filteredField: 400 ) AND ( ( aNewField ) OR ( anotherNewField: 200 ) ) )',
                },
              },
            ],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Lens context (lucene)',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
      query: {
        language: 'kuery',
        query:
          '( ( myField: * ) AND ( bytes > 4000 ) AND ( ( memory > 5000 ) OR ( memory >= 15000 ) ) AND ( myField: * ) AND ( otherField >= 15 ) )',
      },
    });
  });

  it('should add ignored filters as disabled', () => {
    expect(
      combineQueryAndFilters(
        { language: 'lucene', query: 'myField' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            disabled: {
              kuery: [[{ language: 'kuery', query: 'myfield: *' }]],
              lucene: [[{ language: 'lucene', query: 'anotherField' }]],
            },
            enabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [],
            must: [
              {
                query_string: {
                  query: 'anotherField',
                },
              },
            ],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'anotherField (lucene)',
            disabled: true,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'myfield: *',
            disabled: true,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
      query: {
        language: 'lucene',
        query: 'myField',
      },
    });
  });

  it('should work for prefix wildcard in disabled KQL filter', () => {
    expect(
      combineQueryAndFilters(
        undefined,
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            disabled: {
              lucene: [],
              kuery: [[{ language: 'kuery', query: 'myfield: *abc*' }]],
            },
            enabled: { kuery: [], lucene: [] },
          },
        },
        undefined,
        {
          allowLeadingWildcards: true,
        }
      )
    ).toEqual({
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      query_string: {
                        fields: ['myfield'],
                        query: '*abc*',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'myfield: *abc*',
            disabled: true,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
      query: {
        language: 'kuery',
        query: '',
      },
    });
  });

  it('should work together with enabled and disabled filters', () => {
    expect(
      combineQueryAndFilters(
        { language: 'lucene', query: 'myField' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            disabled: {
              kuery: [[{ language: 'kuery', query: 'myfield: abc' }]],
              lucene: [[{ language: 'lucene', query: 'anotherField > 5000' }]],
            },
            enabled: {
              kuery: [[{ language: 'kuery', query: 'myfield: *' }]],
              lucene: [[{ language: 'lucene', query: 'anotherField' }]],
            },
          },
        },
        undefined,
        {}
      )
    ).toEqual({
      filters: [
        {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            should: [],
            must_not: [],
          },
          meta: {
            index: 'testDatasource',
            type: 'custom',
            disabled: false,
            negate: false,
            alias: 'Lens context (kuery)',
          },
          $state: {
            store: 'appState',
          },
        },
        {
          bool: {
            must: [
              {
                query_string: {
                  query: 'anotherField > 5000',
                },
              },
            ],
            filter: [],
            should: [],
            must_not: [],
          },
          meta: {
            index: 'testDatasource',
            type: 'custom',
            disabled: true,
            negate: false,
            alias: 'anotherField > 5000 (lucene)',
          },
          $state: {
            store: 'appState',
          },
        },
        {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        myfield: 'abc',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            should: [],
            must_not: [],
          },
          meta: {
            index: 'testDatasource',
            type: 'custom',
            disabled: true,
            negate: false,
            alias: 'myfield: abc',
          },
          $state: {
            store: 'appState',
          },
        },
      ],
      query: {
        language: 'lucene',
        query: '( ( myField ) AND ( anotherField ) )',
      },
    });
  });
});

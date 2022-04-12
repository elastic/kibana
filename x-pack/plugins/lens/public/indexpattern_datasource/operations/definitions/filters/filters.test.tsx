/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import type { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import type { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { unifiedSearchPluginMock } from '../../../../../../../../src/plugins/unified_search/public/mocks';
import type { FiltersIndexPatternColumn } from '.';
import { filtersOperation } from '../index';
import type { IndexPatternLayer } from '../../../types';
import { createMockedIndexPattern } from '../../../mocks';
import { FilterPopover } from './filter_popover';

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: createMockedIndexPattern(),
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

describe('filters', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = filtersOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'filters',
          dataType: 'document',
          operationType: 'filters',
          scale: 'ordinal',
          isBucketed: true,
          params: {
            filters: [
              {
                input: { query: 'bytes >= 1', language: 'kuery' },
                label: 'More than one',
              },
              {
                input: { query: 'src : 2', language: 'kuery' },
                label: '',
              },
            ],
          },
        } as FiltersIndexPatternColumn,
        col2: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count',
        },
      },
    };
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const esAggsFn = filtersOperation.toEsAggsFn(
        layer.columns.col1 as FiltersIndexPatternColumn,
        'col1',
        createMockedIndexPattern(),
        layer,
        uiSettingsMock
      );

      expect(esAggsFn.arguments.filters).toMatchInlineSnapshot(`
        Array [
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "input": Array [
                    Object {
                      "chain": Array [
                        Object {
                          "arguments": Object {
                            "q": Array [
                              "bytes >= 1",
                            ],
                          },
                          "function": "kql",
                          "type": "function",
                        },
                      ],
                      "type": "expression",
                    },
                  ],
                  "label": Array [
                    "More than one",
                  ],
                },
                "function": "queryFilter",
                "type": "function",
              },
            ],
            "type": "expression",
          },
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "input": Array [
                    Object {
                      "chain": Array [
                        Object {
                          "arguments": Object {
                            "q": Array [
                              "src : 2",
                            ],
                          },
                          "function": "kql",
                          "type": "function",
                        },
                      ],
                      "type": "expression",
                    },
                  ],
                  "label": Array [
                    "",
                  ],
                },
                "function": "queryFilter",
                "type": "function",
              },
            ],
            "type": "expression",
          },
        ]
      `);
    });
  });

  describe('getPossibleOperation', () => {
    it('should return operation with the right type for document', () => {
      expect(filtersOperation.getPossibleOperation()).toEqual({
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      });
    });
  });

  describe('buildColumn', () => {
    it('should build a column with a default query', () => {
      expect(
        filtersOperation.buildColumn({
          previousColumn: undefined,
          layer,
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        label: 'Filters',
        dataType: 'string',
        operationType: 'filters',
        scale: 'ordinal',
        isBucketed: true,
        params: {
          filters: [
            {
              input: {
                query: '',
                language: 'kuery',
              },
              label: '',
            },
          ],
        },
      });
    });

    it('should inherit terms field when transitioning to filters', () => {
      expect(
        filtersOperation.buildColumn({
          previousColumn: {
            operationType: 'terms',
            sourceField: 'bytes',
            label: 'Top values of bytes',
            isBucketed: true,
            dataType: 'number',
            params: {
              // let's ignore terms params here
              format: { id: 'number', params: { decimals: 0 } },
            },
          },
          layer,
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        label: 'Filters',
        dataType: 'string',
        operationType: 'filters',
        scale: 'ordinal',
        isBucketed: true,
        params: {
          filters: [
            {
              input: {
                query: 'bytes : *',
                language: 'kuery',
              },
              label: '',
            },
          ],
        },
      });
    });

    it('should carry over multi terms as multiple filters', () => {
      expect(
        filtersOperation.buildColumn({
          previousColumn: {
            operationType: 'terms',
            sourceField: 'bytes',
            label: 'Top values of bytes',
            isBucketed: true,
            dataType: 'number',
            params: {
              // let's ignore terms params here
              format: { id: 'number', params: { decimals: 0 } },
              // @ts-expect-error not defined in the generic type, only in the Terms specific type
              secondaryFields: ['dest'],
            },
          },
          layer,
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        label: 'Filters',
        dataType: 'string',
        operationType: 'filters',
        scale: 'ordinal',
        isBucketed: true,
        params: {
          filters: [
            {
              input: {
                query: 'bytes : *',
                language: 'kuery',
              },
              label: '',
            },
            {
              input: {
                query: 'dest : *',
                language: 'kuery',
              },
              label: '',
            },
          ],
        },
      });
    });
  });

  describe('popover param editor', () => {
    // @ts-expect-error
    window['__react-beautiful-dnd-disable-dev-warnings'] = true; // issue with enzyme & react-beautiful-dnd throwing errors: https://github.com/atlassian/react-beautiful-dnd/issues/1593
    jest.mock('../../../../../../../../src/plugins/unified_search/public', () => ({
      QueryStringInput: () => {
        return 'QueryStringInput';
      },
    }));

    it('should update state when changing a filter', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
        />
      );

      act(() => {
        instance.find(FilterPopover).first().prop('setFilter')!({
          input: {
            query: 'dest : 5',
            language: 'lucene',
          },
          label: 'Dest5',
          id: 0,
        });
      });
      instance.update();
      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            params: {
              filters: [
                {
                  input: {
                    query: 'dest : 5',
                    language: 'lucene',
                  },
                  label: 'Dest5',
                },
                {
                  input: {
                    language: 'kuery',
                    query: 'src : 2',
                  },
                  label: '',
                },
              ],
            },
          },
        },
      });
    });

    describe('Modify filters', () => {
      it('should correctly show existing filters ', () => {
        const updateLayerSpy = jest.fn();
        const instance = mount(
          <InlineOptions
            {...defaultProps}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
          />
        );
        expect(
          instance
            .find('[data-test-subj="indexPattern-filters-existingFilterContainer"]')
            .at(0)
            .text()
        ).toEqual('More than one');
        expect(
          instance
            .find('[data-test-subj="indexPattern-filters-existingFilterContainer"]')
            .at(3)
            .text()
        ).toEqual('src : 2');
      });

      it('should remove filter', () => {
        const updateLayerSpy = jest.fn();
        const instance = mount(
          <InlineOptions
            {...defaultProps}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
          />
        );

        instance
          .find('[data-test-subj="lns-customBucketContainer-remove"]')
          .at(2)
          .simulate('click');
        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                filters: [
                  {
                    input: {
                      language: 'kuery',
                      query: 'bytes >= 1',
                    },
                    label: 'More than one',
                  },
                ],
              },
            },
          },
        });
      });
    });
  });
});

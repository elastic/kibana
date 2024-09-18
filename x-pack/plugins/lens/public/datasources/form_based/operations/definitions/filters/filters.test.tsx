/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import type { IUiSettingsClient, HttpSetup } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FiltersIndexPatternColumn } from '.';
import { filtersOperation } from '..';
import type { FormBasedLayer } from '../../../types';
import { createMockedIndexPattern } from '../../../mocks';
import userEvent from '@testing-library/user-event';

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: createMockedIndexPattern(),
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

// @ts-expect-error
window['__@hello-pangea/dnd-disable-dev-warnings'] = true; // issue with enzyme & @hello-pangea/dnd throwing errors: https://github.com/hello-pangea/dnd/issues/644
jest.mock('@kbn/unified-search-plugin/public', () => ({
  QueryStringInput: () => {
    return 'QueryStringInput';
  },
}));

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
  let layer: FormBasedLayer;
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
                query: '"bytes" : *',
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
                query: '"bytes" : *',
                language: 'kuery',
              },
              label: '',
            },
            {
              input: {
                query: '"dest" : *',
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
    it('should update state when changing a filter', async () => {
      jest.useFakeTimers();
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const updateLayerSpy = jest.fn();
      render(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
        />
      );

      await user.click(screen.getAllByTestId('indexPattern-filters-existingFilterTrigger')[1]);
      fireEvent.change(screen.getByTestId('indexPattern-filters-label'), {
        target: { value: 'Dest5' },
      });
      act(() => jest.advanceTimersByTime(256));

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            params: {
              filters: [
                ...(layer.columns.col1 as FiltersIndexPatternColumn).params.filters.slice(0, 1),
                {
                  input: {
                    language: 'kuery',
                    query: 'src : 2',
                  },
                  label: 'Dest5',
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
        render(
          <InlineOptions
            {...defaultProps}
            layer={layer}
            paramEditorUpdater={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
          />
        );
        const filtersLabels = screen
          .getAllByTestId('indexPattern-filters-existingFilterTrigger')
          .map((button) => button.textContent);
        expect(filtersLabels).toEqual(['More than one', 'src : 2']);
      });

      it('should remove filter', async () => {
        // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        jest.useFakeTimers();
        const updateLayerSpy = jest.fn();
        render(
          <InlineOptions
            {...defaultProps}
            layer={layer}
            paramEditorUpdater={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
          />
        );

        await user.click(screen.getByTestId('lns-customBucketContainer-remove-1'));

        act(() => jest.advanceTimersByTime(256));

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

  describe('getMaxPossibleNumValues', () => {
    it('reports number of filters', () => {
      expect(
        filtersOperation.getMaxPossibleNumValues!(layer.columns.col1 as FiltersIndexPatternColumn)
      ).toBe(2);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow, mount } from 'enzyme';
import { EuiButtonGroup, EuiComboBox, EuiFieldNumber, EuiSelect, EuiSwitch } from '@elastic/eui';
import type {
  IUiSettingsClient,
  SavedObjectsClientContract,
  HttpSetup,
  CoreStart,
} from 'kibana/public';
import type { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { createMockedIndexPattern } from '../../../mocks';
import { ValuesInput } from './values_input';
import type { TermsIndexPatternColumn } from '.';
import { GenericOperationDefinition, termsOperation, LastValueIndexPatternColumn } from '../index';
import { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from '../../../types';
import { FrameDatasourceAPI } from '../../../../types';
import { DateHistogramIndexPatternColumn } from '../date_histogram';
import { getOperationSupportMatrix } from '../../../dimension_panel/operation_support';
import { FieldSelect } from '../../../dimension_panel/field_select';

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

// Need to mock the debounce call to test some FieldInput behaviour
jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: createMockedIndexPattern(),
  // need to provide the terms operation as some helpers use operation specific features
  operationDefinitionMap: { terms: termsOperation as unknown as GenericOperationDefinition },
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

describe('terms', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = termsOperation.paramEditor!;
  const InlineFieldInput = termsOperation.renderFieldInput!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'Top 3 values of source',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'source',
        } as TermsIndexPatternColumn,
        col2: {
          label: 'Count of records',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count',
        },
      },
    };
  });

  function createMultiTermsColumn(terms: string | string[]): TermsIndexPatternColumn {
    const termsArray = Array.isArray(terms) ? terms : [terms];

    const [sourceField, ...secondaryFields] = termsArray;

    return {
      operationType: 'terms',
      sourceField,
      label: 'Top values of source',
      isBucketed: true,
      dataType: 'string',
      params: {
        size: 5,
        orderBy: {
          type: 'alphabetical',
        },
        orderDirection: 'asc',
        secondaryFields,
      },
    };
  }

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const termsColumn = layer.columns.col1 as TermsIndexPatternColumn;
      const esAggsFn = termsOperation.toEsAggsFn(
        { ...termsColumn, params: { ...termsColumn.params, otherBucket: true } },
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            orderBy: ['_key'],
            field: ['source'],
            size: [3],
            otherBucket: [true],
          }),
        })
      );
    });

    it('should add shard size if accuracy mode enabled', () => {
      const termsColumn = layer.columns.col1 as TermsIndexPatternColumn;
      const getEsAggsFnArgs = (accuracyMode: boolean, size: number) =>
        termsOperation.toEsAggsFn(
          {
            ...termsColumn,
            params: { ...termsColumn.params, otherBucket: true, accuracyMode, size },
          },
          'col1',
          {} as IndexPattern,
          layer,
          uiSettingsMock,
          []
        ).arguments;

      const smallSize = 5;
      const bigSize = 900;

      expect(getEsAggsFnArgs(true, smallSize).shardSize?.[0]).toEqual(1000);
      expect(getEsAggsFnArgs(true, bigSize).shardSize?.[0]).toEqual(1360);
      expect(getEsAggsFnArgs(false, smallSize).shardSize).not.toBeDefined();
    });

    it('should reflect rare terms params correctly', () => {
      const termsColumn = layer.columns.col1 as TermsIndexPatternColumn;
      const esAggsFn = termsOperation.toEsAggsFn(
        {
          ...termsColumn,
          params: { ...termsColumn.params, orderBy: { type: 'rare', maxDocCount: 3 } },
        },
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggRareTerms',
          arguments: expect.objectContaining({
            field: ['source'],
            max_doc_count: [3],
          }),
        })
      );
    });

    it('should not enable missing bucket if other bucket is not set', () => {
      const termsColumn = layer.columns.col1 as TermsIndexPatternColumn;
      const esAggsFn = termsOperation.toEsAggsFn(
        {
          ...termsColumn,
          params: { ...termsColumn.params, otherBucket: false, missingBucket: true },
        },
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            otherBucket: [false],
            missingBucket: [false],
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly to new field', () => {
      const oldColumn: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'source',
        label: 'Top 5 values of source',
        isBucketed: true,
        dataType: 'string',
        params: {
          size: 5,
          orderBy: {
            type: 'alphabetical',
          },
          orderDirection: 'asc',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('bytes')!;

      const column = termsOperation.onFieldChange(oldColumn, newNumberField);
      expect(column).toHaveProperty('dataType', 'number');
      expect(column).toHaveProperty('sourceField', 'bytes');
      expect(column).toHaveProperty('params.size', 5);
      expect(column).toHaveProperty('params.orderBy.type', 'alphabetical');
      expect(column).toHaveProperty('params.orderDirection', 'asc');
      expect(column.label).toContain('bytes');
    });

    it('should remove numeric parameters when changing away from number', () => {
      const oldColumn: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'bytes',
        label: 'Top 5 values of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          size: 5,
          orderBy: {
            type: 'alphabetical',
          },
          orderDirection: 'asc',
          format: { id: 'number', params: { decimals: 0 } },
          parentFormat: { id: 'terms' },
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newStringField = indexPattern.getFieldByName('source')!;

      const column = termsOperation.onFieldChange(oldColumn, newStringField);
      expect(column).toHaveProperty('dataType', 'string');
      expect(column).toHaveProperty('sourceField', 'source');
      expect(column.params.format).toBeUndefined();
      // Preserve the parentFormat as it will be ignored down the line if not required
      expect(column.params.parentFormat).toEqual({ id: 'terms' });
    });

    it('should remove secondary fields when a new field is passed', () => {
      const oldColumn: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'bytes',
        label: 'Top 5 values of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          size: 5,
          orderBy: {
            type: 'alphabetical',
          },
          orderDirection: 'asc',
          format: { id: 'number', params: { decimals: 0 } },
          secondaryFields: ['dest'],
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newStringField = indexPattern.getFieldByName('source')!;

      const column = termsOperation.onFieldChange(oldColumn, newStringField);
      expect(column.params.secondaryFields).toBeUndefined();
    });

    it('should merge secondaryFields when coming from partial column argument', () => {
      const oldColumn: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'bytes',
        label: 'Top 5 values of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          size: 5,
          orderBy: {
            type: 'alphabetical',
          },
          orderDirection: 'asc',
          format: { id: 'number', params: { decimals: 0 } },
          secondaryFields: ['dest'],
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumericField = indexPattern.getFieldByName('bytes')!;

      const column = termsOperation.onFieldChange(oldColumn, newNumericField, {
        secondaryFields: ['dest', 'geo.src'],
      });
      expect(column.params.secondaryFields).toEqual(expect.arrayContaining(['dest', 'geo.src']));
    });

    it('should reassign the parentFormatter on single field change', () => {
      const oldColumn: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'bytes',
        label: 'Top 5 values of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          size: 5,
          orderBy: {
            type: 'alphabetical',
          },
          orderDirection: 'asc',
          format: { id: 'number', params: { decimals: 0 } },
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('memory')!;

      const column = termsOperation.onFieldChange(oldColumn, newNumberField);
      expect(column.params.parentFormat).toEqual({ id: 'terms' });
    });

    it('should reassign the parentFormatter on multiple fields change', () => {
      const oldColumn: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'bytes',
        label: 'Top 5 values of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          size: 5,
          orderBy: {
            type: 'alphabetical',
          },
          orderDirection: 'asc',
          format: { id: 'number', params: { decimals: 0 } },
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('memory')!;

      const column = termsOperation.onFieldChange(oldColumn, newNumberField);
      expect(column.params.parentFormat).toEqual({ id: 'terms' });
    });
  });

  describe('getPossibleOperationForField', () => {
    it('should return operation with the right type', () => {
      expect(
        termsOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        })
      ).toEqual({
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      });

      expect(
        termsOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'number',
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: true,
        scale: 'ordinal',
      });

      expect(
        termsOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'boolean',
        })
      ).toEqual({
        dataType: 'boolean',
        isBucketed: true,
        scale: 'ordinal',
      });

      expect(
        termsOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'ip',
        })
      ).toEqual({
        dataType: 'ip',
        isBucketed: true,
        scale: 'ordinal',
      });
    });

    it('should not return an operation if restrictions prevent terms', () => {
      expect(
        termsOperation.getPossibleOperationForField({
          aggregatable: false,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);

      expect(
        termsOperation.getPossibleOperationForField({
          aggregatable: true,
          aggregationRestrictions: {},
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
    });
  });

  describe('buildColumn', () => {
    it('should use type from the passed field', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(termsColumn.dataType).toEqual('boolean');
    });

    it('should set other bucket to true by default', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(termsColumn.params.otherBucket).toEqual(true);
    });

    it('should set other bucket to false if index pattern has restrictions', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: { ...createMockedIndexPattern(), hasRestrictions: true },
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(termsColumn.params.otherBucket).toEqual(false);
    });

    it('should use existing sortable metric column as order column', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        layer: {
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
          columnOrder: [],
          indexPatternId: '',
        },
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'column', columnId: 'col1' },
        })
      );
    });
    it('should set alphabetical order type if metric column is of type last value and showing array values', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        layer: {
          columns: {
            col1: {
              label: 'Last value of a',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'a',
              operationType: 'last_value',
              params: {
                sortField: 'datefield',
                showArrayValues: true,
              },
            } as LastValueIndexPatternColumn,
          },
          columnOrder: [],
          indexPatternId: '',
        },
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(termsColumn.params).toEqual(
        expect.objectContaining({ orderBy: { type: 'alphabetical', fallback: true } })
      );
    });
    it('should NOT set alphabetical order type if metric column is of type last value and NOT showing array values', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        layer: {
          columns: {
            col1: {
              label: 'Last value of a',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'a',
              operationType: 'last_value',
              params: {
                sortField: 'datefield',
                showArrayValues: false,
              },
            } as LastValueIndexPatternColumn,
          },
          columnOrder: [],
          indexPatternId: '',
        },
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(termsColumn.params).toEqual(
        expect.objectContaining({ orderBy: { type: 'column', columnId: 'col1' } })
      );
    });

    it('should use the default size when there is an existing bucket', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        layer,
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(termsColumn.params).toEqual(expect.objectContaining({ size: 3 }));
    });

    it('should use a size of 5 when there are no other buckets', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(termsColumn.params).toEqual(expect.objectContaining({ size: 5 }));
    });

    it('should set a parentFormat as "terms" if a numeric field is passed', () => {
      const termsColumn = termsOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        field: {
          aggregatable: true,
          searchable: true,
          type: 'number',
          name: 'numericTest',
          displayName: 'test',
        },
      });
      expect(termsColumn.params).toEqual(
        expect.objectContaining({ parentFormat: { id: 'terms' } })
      );
    });
  });

  describe('onOtherColumnChanged', () => {
    it('should keep the column if order by column still exists and is isSortableByColumn metric', () => {
      const initialColumn: TermsIndexPatternColumn = {
        label: 'Top value of category',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        params: {
          orderBy: { type: 'column', columnId: 'col1' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'category',
      };
      const updatedColumn = termsOperation.onOtherColumnChanged!(
        {
          indexPatternId: '',
          columnOrder: [],
          columns: {
            col2: initialColumn,
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
        },
        'col2',
        'col1'
      );

      expect(updatedColumn).toBe(initialColumn);
    });

    it('should switch to alphabetical ordering if metric is of type last_value and using top hit agg', () => {
      const initialColumn: TermsIndexPatternColumn = {
        label: 'Top value of category',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        params: {
          orderBy: { type: 'column', columnId: 'col1' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'category',
      };
      const updatedColumn = termsOperation.onOtherColumnChanged!(
        {
          columns: {
            col2: initialColumn,
            col1: {
              label: 'Last Value',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'bytes',
              operationType: 'last_value',
              params: {
                sortField: 'time',
                showArrayValues: true,
              },
            } as LastValueIndexPatternColumn,
          },
          columnOrder: [],
          indexPatternId: '',
        },
        'col2',
        'col1'
      );
      expect(updatedColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'alphabetical', fallback: true },
        })
      );
    });

    it('should switch to alphabetical ordering if metric is reference-based', () => {
      const initialColumn: TermsIndexPatternColumn = {
        label: 'Top value of category',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        params: {
          orderBy: { type: 'column', columnId: 'col1' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'category',
      };
      const updatedColumn = termsOperation.onOtherColumnChanged!(
        {
          columns: {
            col2: initialColumn,
            col1: {
              label: 'Cumulative sum',
              dataType: 'number',
              isBucketed: false,
              operationType: 'cumulative_sum',
              references: ['referenced'],
            },
            referenced: {
              label: '',
              dataType: 'number',
              isBucketed: false,
              operationType: 'count',
              sourceField: '___records___',
            },
          },
          columnOrder: [],
          indexPatternId: '',
        },
        'col2',
        'col1'
      );
      expect(updatedColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'alphabetical', fallback: true },
        })
      );
    });

    it('should switch to alphabetical ordering if there are no columns to order by', () => {
      const termsColumn = termsOperation.onOtherColumnChanged!(
        {
          columns: {
            col2: {
              label: 'Top value of category',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              params: {
                orderBy: { type: 'column', columnId: 'col1' },
                size: 3,
                orderDirection: 'asc',
              },
              sourceField: 'category',
            } as TermsIndexPatternColumn,
          },
          columnOrder: [],
          indexPatternId: '',
        },
        'col2',
        'col1'
      );
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'alphabetical', fallback: true },
        })
      );
    });

    it('should switch to alphabetical ordering if the order column is not a metric anymore', () => {
      const termsColumn = termsOperation.onOtherColumnChanged!(
        {
          columns: {
            col2: {
              label: 'Top value of category',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              params: {
                orderBy: { type: 'column', columnId: 'col1' },
                size: 3,
                orderDirection: 'asc',
              },
              sourceField: 'category',
            } as TermsIndexPatternColumn,
            col1: {
              label: 'Value of timestamp',
              dataType: 'date',
              isBucketed: true,

              // Private
              operationType: 'date_histogram',
              params: {
                interval: 'w',
              },
              sourceField: 'timestamp',
            } as DateHistogramIndexPatternColumn,
          },
          columnOrder: [],
          indexPatternId: '',
        },
        'col2',
        'col1'
      );
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'alphabetical', fallback: true },
        })
      );
    });

    it('should set order to ascending if falling back to alphabetical', () => {
      const termsColumn = termsOperation.onOtherColumnChanged!(
        {
          columns: {
            col2: {
              label: 'Top value of category',
              dataType: 'string',
              isBucketed: true,

              // Private
              operationType: 'terms',
              params: {
                orderBy: { type: 'column', columnId: 'col1' },
                size: 3,
                orderDirection: 'desc',
              },
              sourceField: 'category',
            } as TermsIndexPatternColumn,
          },
          columnOrder: [],
          indexPatternId: '',
        },
        'col2',
        'col1'
      );
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderDirection: 'asc',
        })
      );
    });

    it('should switch back to descending metric sorting if alphabetical sorting was applied as fallback', () => {
      const initialColumn: TermsIndexPatternColumn = {
        label: 'Top value of category',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical', fallback: true },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'category',
      };
      const updatedColumn = termsOperation.onOtherColumnChanged!(
        {
          indexPatternId: '',
          columnOrder: [],
          columns: {
            col2: initialColumn,
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: '___records___',
              operationType: 'count',
            },
          },
        },
        'col2',
        'col1'
      );

      expect(updatedColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'column', columnId: 'col1' },
          orderDirection: 'desc',
        })
      );
    });
  });

  describe('getDefaultLabel', () => {
    it('should return the default label for single value', () => {
      expect(
        termsOperation.getDefaultLabel(
          {
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            params: {
              orderBy: { type: 'alphabetical', fallback: true },
              size: 3,
              orderDirection: 'asc',
            },
            sourceField: 'source',
          } as TermsIndexPatternColumn,
          createMockedIndexPattern(),
          {}
        )
      ).toBe('Top 3 values of source');
    });

    it('should return main value with single counter for two fields', () => {
      expect(
        termsOperation.getDefaultLabel(
          {
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            params: {
              orderBy: { type: 'alphabetical', fallback: true },
              size: 3,
              orderDirection: 'asc',
              secondaryFields: ['bytes'],
            },
            sourceField: 'source',
          } as TermsIndexPatternColumn,
          createMockedIndexPattern(),
          {}
        )
      ).toBe('Top values of source + 1 other');
    });

    it('should return main value with counter value for multiple values', () => {
      expect(
        termsOperation.getDefaultLabel(
          {
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            params: {
              orderBy: { type: 'alphabetical', fallback: true },
              size: 3,
              orderDirection: 'asc',
              secondaryFields: ['bytes', 'memory'],
            },
            sourceField: 'source',
          } as TermsIndexPatternColumn,
          createMockedIndexPattern(),
          {}
        )
      ).toBe('Top values of source + 2 others');
    });
  });

  describe('field input', () => {
    // @ts-expect-error
    window['__react-beautiful-dnd-disable-dev-warnings'] = true; // issue with enzyme & react-beautiful-dnd throwing errors: https://github.com/atlassian/react-beautiful-dnd/issues/1593

    const defaultFieldInputProps = {
      indexPattern: defaultProps.indexPattern,
      currentFieldIsInvalid: false,
      incompleteField: null,
      incompleteOperation: undefined,
      incompleteParams: {},
      dimensionGroups: [],
      groupId: 'any',
      operationDefinitionMap: { terms: termsOperation, date_histogram: {} } as unknown as Record<
        string,
        GenericOperationDefinition
      >,
    };

    function getExistingFields() {
      const fields: Record<string, boolean> = {};
      for (const field of defaultProps.indexPattern.fields) {
        fields[field.name] = true;
      }
      return {
        [layer.indexPatternId]: fields,
      };
    }

    function getDefaultOperationSupportMatrix(
      columnId: string,
      existingFields: Record<string, Record<string, boolean>>
    ) {
      return getOperationSupportMatrix({
        state: {
          layers: { layer1: layer },
          indexPatterns: {
            [defaultProps.indexPattern.id]: defaultProps.indexPattern,
          },
          existingFields,
        } as unknown as IndexPatternPrivateState,
        layerId: 'layer1',
        filterOperations: () => true,
        columnId,
      });
    }

    it('should render the default field input for no field (incomplete operation)', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          incompleteOperation="terms"
        />
      );

      // Fallback field input has no add button
      expect(instance.find('[data-test-subj="indexPattern-terms-add-field"]').exists()).toBeFalsy();
      // check the error state too
      expect(
        instance
          .find('[data-test-subj="indexPattern-field-selection-row"]')
          .first()
          .prop('isInvalid')
      ).toBeTruthy();
    });

    it('should show an error message when first field is invalid', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      layer.columns.col1 = {
        label: 'Top value of unsupported',
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'unsupported',
      } as TermsIndexPatternColumn;
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          currentFieldIsInvalid
        />
      );
      expect(
        instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
      ).toBe('Invalid field. Check your data view or pick another field.');
    });

    it('should show an error message when first field is not supported', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      layer.columns.col1 = {
        label: 'Top value of timestamp',
        dataType: 'date',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'timestamp',
      } as TermsIndexPatternColumn;
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
          incompleteOperation="terms"
        />
      );
      expect(
        instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
      ).toBe('This field does not work with the selected function.');
    });

    it('should show an error message when any field but the first is invalid', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      layer.columns.col1 = {
        label: 'Top value of geo.src + 1 other',
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
          secondaryFields: ['unsupported'],
        },
        sourceField: 'geo.src',
      } as TermsIndexPatternColumn;
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );
      expect(
        instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
      ).toBe('Invalid field: "unsupported". Check your data view or pick another field.');
    });

    it('should show an error message when any field but the first is not supported', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      layer.columns.col1 = {
        label: 'Top value of geo.src + 1 other',
        dataType: 'date',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
          secondaryFields: ['timestamp'],
        },
        sourceField: 'geo.src',
      } as TermsIndexPatternColumn;
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );
      expect(
        instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
      ).toBe('Invalid field: "timestamp". Check your data view or pick another field.');
    });

    it('should render the an add button for single layer, but no other hints', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').exists()
      ).toBeTruthy();

      expect(instance.find('[data-test-subj^="indexPattern-terms-removeField-"]').length).toBe(0);
    });

    it('should switch to the first supported operation when in single term mode and the picked field is not supported', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      // pick a date field
      act(() => {
        instance.find(FieldSelect).prop('onChoose')!({
          type: 'field',
          field: 'timestamp',
          operationType: 'date_histogram',
        });
      });

      expect(updateLayerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.objectContaining({
            col1: expect.objectContaining({ operationType: 'date_histogram' }),
          }),
        })
      );
    });

    it('should render the multi terms specific UI', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = ['bytes'];
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').exists()
      ).toBeTruthy();
      // the produced Enzyme DOM has the both the React component and the actual html
      // tags with the same "data-test-subj" assigned. Here it is enough to check that multiple are rendered
      expect(
        instance.find('[data-test-subj^="indexPattern-terms-removeField-"]').length
      ).toBeGreaterThan(1);
      expect(
        instance.find('[data-test-subj^="indexPattern-terms-dragToReorder-"]').length
      ).toBeGreaterThan(1);
    });

    it('should return to single value UI when removing second item of two', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = ['memory'];
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance.find('[data-test-subj^="indexPattern-terms-removeField-"]').length
      ).toBeGreaterThan(1);

      act(() => {
        instance
          .find('[data-test-subj="indexPattern-terms-removeField-1"]')
          .first()
          .simulate('click');
      });

      expect(instance.find('[data-test-subj="indexPattern-terms-removeField-"]').length).toBe(0);
    });

    it('should disable remove button and reorder drag when single value and one temporary new field', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      let instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      // add a new field
      act(() => {
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().simulate('click');
      });

      instance = instance.update();
      // now two delete buttons should be visualized
      expect(instance.find('[data-test-subj="indexPattern-terms-removeField-1"]').exists()).toBe(
        true
      );
      // first button is disabled
      expect(
        instance
          .find('[data-test-subj="indexPattern-terms-removeField-0"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);
      // while second delete is still enabled
      expect(
        instance
          .find('[data-test-subj="indexPattern-terms-removeField-1"]')
          .first()
          .prop('isDisabled')
      ).toBe(false);
    });

    it('should accept scripted fields for single value', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).sourceField = 'scripted';
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance
          .find('[data-test-subj="indexPattern-field-selection-row"]')
          .first()
          .prop('isInvalid')
      ).toBeFalsy();
    });

    it('should mark scripted fields for multiple values', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).sourceField = 'scripted';
      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = ['memory'];
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance
          .find('[data-test-subj="indexPattern-field-selection-row"]')
          .first()
          .prop('isInvalid')
      ).toBeTruthy();
      expect(
        instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
      ).toBe('Scripted fields are not supported when using multiple fields');
    });

    it('should not filter scripted fields when in single value', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance.find('[data-test-subj="indexPattern-dimension-field"]').first().prop('options')
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.objectContaining({ 'data-test-subj': 'lns-fieldOption-scripted' }),
            ]),
          }),
        ])
      );
    });

    it('should filter scripted fields when in multi terms mode', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = ['memory'];
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      // get inner instance
      expect(
        instance.find('[data-test-subj="indexPattern-dimension-field-0"]').at(1).prop('options')
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.not.objectContaining({ 'data-test-subj': 'lns-fieldOption-scripted' }),
            ]),
          }),
        ])
      );
    });

    it('should filter already used fields when displaying fields list', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = ['memory', 'bytes'];
      let instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      // add a new field
      act(() => {
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().simulate('click');
      });

      instance = instance.update();

      // Get the inner instance with the data-test-subj
      expect(
        instance.find('[data-test-subj="indexPattern-dimension-field-3"]').at(1).prop('options')
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            options: expect.not.arrayContaining([
              expect.objectContaining({ label: 'memory' }),
              expect.objectContaining({ label: 'bytes' }),
            ]),
          }),
        ])
      );
    });

    it('should filter fields with unsupported types when in multi terms mode', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = ['memory'];
      const instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      // get inner instance
      expect(
        instance.find('[data-test-subj="indexPattern-dimension-field-0"]').at(1).prop('options')
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.not.objectContaining({ 'data-test-subj': 'lns-fieldOption-timestamp' }),
            ]),
          }),
        ])
      );
    });

    it('should limit the number of multiple fields', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      (layer.columns.col1 as TermsIndexPatternColumn).params.secondaryFields = [
        'memory',
        'bytes',
        'dest',
      ];
      let instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().prop('isDisabled')
      ).toBeTruthy();
      // clicking again will no increase the number of fields
      act(() => {
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().simulate('click');
      });
      instance = instance.update();
      expect(
        instance.find('[data-test-subj="indexPattern-terms-removeField-4"]').exists()
      ).toBeFalsy();
    });

    it('should let the user add new empty field up to the limit', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      let instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );
      expect(
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().prop('isDisabled')
      ).toBeFalsy();

      // click 3 times to add new fields
      for (const _ of [1, 2, 3]) {
        act(() => {
          instance
            .find('[data-test-subj="indexPattern-terms-add-field"]')
            .first()
            .simulate('click');
        });
        instance = instance.update();
      }

      expect(
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().prop('isDisabled')
      ).toBeTruthy();
    });

    it('should update the parentFormatter on transition between single to multi terms', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      let instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );
      // add a new field
      act(() => {
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().simulate('click');
      });
      instance = instance.update();

      act(() => {
        instance.find(EuiComboBox).last().prop('onChange')!([
          { value: { type: 'field', field: 'bytes' }, label: 'bytes' },
        ]);
      });

      expect(updateLayerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.objectContaining({
            col1: expect.objectContaining({
              params: expect.objectContaining({
                parentFormat: { id: 'multi_terms' },
              }),
            }),
          }),
        })
      );
    });

    it('should preserve custom label when set by the user', () => {
      const updateLayerSpy = jest.fn();
      const existingFields = getExistingFields();
      const operationSupportMatrix = getDefaultOperationSupportMatrix('col1', existingFields);

      layer.columns.col1 = {
        label: 'MyCustomLabel',
        customLabel: true,
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
          secondaryFields: ['geo.src'],
        },
        sourceField: 'source',
      } as TermsIndexPatternColumn;
      let instance = mount(
        <InlineFieldInput
          {...defaultFieldInputProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          existingFields={existingFields}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );
      // add a new field
      act(() => {
        instance.find('[data-test-subj="indexPattern-terms-add-field"]').first().simulate('click');
      });
      instance = instance.update();

      act(() => {
        instance.find(EuiComboBox).last().prop('onChange')!([
          { value: { type: 'field', field: 'bytes' }, label: 'bytes' },
        ]);
      });

      expect(updateLayerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.objectContaining({
            col1: expect.objectContaining({
              label: 'MyCustomLabel',
            }),
          }),
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current other bucket value', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      const select = instance
        .find('[data-test-subj="indexPattern-terms-other-bucket"]')
        .find(EuiSwitch);

      expect(select.prop('checked')).toEqual(false);
    });

    it('should hide other bucket setting for rollups', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          indexPattern={{
            ...createMockedIndexPattern(),
            hasRestrictions: true,
          }}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(instance.find('[data-test-subj="indexPattern-terms-other-bucket"]').length).toEqual(0);
    });

    it('should disable missing bucket setting as long as other bucket is not set', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      const select = instance
        .find('[data-test-subj="indexPattern-terms-missing-bucket"]')
        .find(EuiSwitch);

      expect(select.prop('disabled')).toEqual(true);
    });

    it('should enable missing bucket setting as long as other bucket is set', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={
            {
              ...layer.columns.col1,
              params: {
                ...(layer.columns.col1 as TermsIndexPatternColumn).params,
                otherBucket: true,
              },
            } as TermsIndexPatternColumn
          }
        />
      );

      const select = instance
        .find('[data-test-subj="indexPattern-terms-missing-bucket"]')
        .find(EuiSwitch);

      expect(select.prop('disabled')).toEqual(false);
    });

    it('should disable missing bucket and other bucket setting for rarity sorting', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={{
            ...(layer.columns.col1 as TermsIndexPatternColumn),
            params: {
              ...(layer.columns.col1 as TermsIndexPatternColumn).params,
              orderBy: { type: 'rare', maxDocCount: 3 },
            },
          }}
        />
      );

      const select1 = instance
        .find('[data-test-subj="indexPattern-terms-missing-bucket"]')
        .find(EuiSwitch);

      expect(select1.prop('disabled')).toEqual(true);

      const select2 = instance
        .find('[data-test-subj="indexPattern-terms-other-bucket"]')
        .find(EuiSwitch);

      expect(select2.prop('disabled')).toEqual(true);
    });

    it('should disable size input and show max doc count input', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={{
            ...(layer.columns.col1 as TermsIndexPatternColumn),
            params: {
              ...(layer.columns.col1 as TermsIndexPatternColumn).params,
              orderBy: { type: 'rare', maxDocCount: 3 },
            },
          }}
        />
      );

      const numberInputs = instance.find(ValuesInput);

      expect(numberInputs).toHaveLength(2);

      expect(numberInputs.first().prop('disabled')).toBeTruthy();
      expect(numberInputs.last().prop('disabled')).toBeFalsy();
      expect(numberInputs.last().prop('value')).toEqual(3);
    });

    it('should disable missing bucket setting if field is not a string', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={
            {
              ...layer.columns.col1,
              sourceField: 'bytes',
              params: {
                ...(layer.columns.col1 as TermsIndexPatternColumn).params,
                otherBucket: true,
              },
            } as TermsIndexPatternColumn
          }
        />
      );

      const select = instance
        .find('[data-test-subj="indexPattern-terms-missing-bucket"]')
        .find(EuiSwitch);

      expect(select.prop('disabled')).toEqual(true);
    });

    it('should update state when clicking other bucket toggle', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      instance
        .find('[data-test-subj="indexPattern-terms-other-bucket"]')
        .find(EuiSwitch)
        .simulate('change', {
          target: {
            checked: true,
          },
        });

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            params: {
              ...(layer.columns.col1 as TermsIndexPatternColumn).params,
              otherBucket: true,
            },
          },
        },
      });
    });

    it('should render current order by value and options', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      const select = instance.find('[data-test-subj="indexPattern-terms-orderBy"]').find(EuiSelect);

      expect(select.prop('value')).toEqual('alphabetical');

      expect(select.prop('options')!.map(({ value }) => value)).toEqual([
        'column$$$col2',
        'alphabetical',
        'rare',
      ]);
    });

    it('should disable rare ordering for floating point types', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={
            { ...layer.columns.col1, sourceField: 'memory' } as TermsIndexPatternColumn
          }
        />
      );

      const select = instance.find('[data-test-subj="indexPattern-terms-orderBy"]').find(EuiSelect);

      expect(select.prop('value')).toEqual('alphabetical');

      expect(select.prop('options')!.map(({ value }) => value)).toEqual([
        'column$$$col2',
        'alphabetical',
      ]);
    });

    it('should update state with the order by value', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      instance
        .find(EuiSelect)
        .find('[data-test-subj="indexPattern-terms-orderBy"]')
        .simulate('change', {
          target: {
            value: 'column$$$col2',
          },
        });

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            params: {
              ...(layer.columns.col1 as TermsIndexPatternColumn).params,
              orderBy: {
                type: 'column',
                columnId: 'col2',
              },
              orderDirection: 'desc',
            },
          },
        },
      });
    });

    it('should render current order direction value and options', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      const selection = instance.find(EuiButtonGroup);
      expect(selection.prop('idSelected')).toContain('asc');
      expect(selection.prop('options').map(({ value }) => value)).toEqual(['asc', 'desc']);
    });

    it('should update state with the order direction value', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      instance.find(EuiButtonGroup).simulate('change', 'desc');

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            params: {
              ...(layer.columns.col1 as TermsIndexPatternColumn).params,
              orderDirection: 'desc',
            },
          },
        },
      });
    });

    it('should render current size value', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      expect(instance.find(EuiFieldNumber).prop('value')).toEqual('3');
    });

    it('should update state with the size value', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as TermsIndexPatternColumn}
        />
      );

      act(() => {
        instance.find(ValuesInput).prop('onChange')!(7);
      });

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            label: 'Top 7 values of source',
            params: {
              ...(layer.columns.col1 as TermsIndexPatternColumn).params,
              size: 7,
            },
          },
        },
      });
    });
  });
  describe('getErrorMessage', () => {
    let indexPattern: IndexPattern;
    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
      layer = {
        columns: {
          col1: {
            dataType: 'boolean',
            isBucketed: true,
            label: 'Top 5 values of bytes',
            operationType: 'terms',
            params: {
              missingBucket: false,
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              otherBucket: true,
              size: 5,
            },
            scale: 'ordinal',
            sourceField: 'bytes',
          } as TermsIndexPatternColumn,
        },
        columnOrder: [],
        indexPatternId: '',
      };
    });
    it('returns undefined for no errors found', () => {
      expect(termsOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual(undefined);
    });
    it('returns error message if the sourceField does not exist in index pattern', () => {
      layer = {
        ...layer,
        columns: {
          col1: {
            ...layer.columns.col1,
            sourceField: 'notExisting',
          } as TermsIndexPatternColumn,
        },
      };
      expect(termsOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual([
        'Field notExisting was not found',
      ]);
    });

    it('return no error for scripted field when in single mode', () => {
      layer = {
        ...layer,
        columns: {
          col1: {
            ...layer.columns.col1,
            sourceField: 'scripted',
          } as TermsIndexPatternColumn,
        },
      };
      expect(termsOperation.getErrorMessage!(layer, 'col1', indexPattern)).toBeUndefined();
    });

    it('return error for scripted field when in multi terms mode', () => {
      const column = layer.columns.col1 as TermsIndexPatternColumn;
      layer = {
        ...layer,
        columns: {
          col1: {
            ...column,
            sourceField: 'scripted',
            params: {
              ...column.params,
              secondaryFields: ['bytes'],
            },
          } as TermsIndexPatternColumn,
        },
      };
      expect(termsOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual([
        'Scripted fields are not supported when using multiple fields, found scripted',
      ]);
    });

    describe('time shift error', () => {
      beforeEach(() => {
        layer = {
          ...layer,
          columnOrder: ['col1', 'col2', 'col3'],
          columns: {
            ...layer.columns,
            col2: {
              dataType: 'number',
              isBucketed: false,
              operationType: 'count',
              label: 'Count',
              sourceField: 'document',
            },
            col3: {
              dataType: 'number',
              isBucketed: false,
              operationType: 'count',
              label: 'Count',
              sourceField: 'document',
              timeShift: '1d',
            },
          },
        };
      });
      it('returns error message if two time shifts are used together with terms', () => {
        expect(termsOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual([
          expect.objectContaining({
            message:
              'In a single layer, you are unable to combine metrics with different time shifts and dynamic top values. Use the same time shift value for all metrics, or use filters instead of top values.',
          }),
        ]);
      });
      it('returns fix action which calls field information endpoint and creates a pinned top values', async () => {
        const errorMessage = termsOperation.getErrorMessage!(layer, 'col1', indexPattern)![0];
        const fixAction = (
          typeof errorMessage === 'object' ? errorMessage.fixAction!.newState : undefined
        )!;
        const coreMock = {
          uiSettings: {
            get: () => undefined,
          },
          http: {
            post: jest.fn(() =>
              Promise.resolve({
                topValues: {
                  buckets: [
                    {
                      key: 'A',
                    },
                    {
                      key: 'B',
                    },
                  ],
                },
              })
            ),
          },
        } as unknown as CoreStart;
        const newLayer = await fixAction(
          coreMock,
          {
            query: { language: 'kuery', query: 'a: b' },
            filters: [],
            dateRange: {
              fromDate: '2020',
              toDate: '2021',
            },
          } as unknown as FrameDatasourceAPI,
          'first'
        );
        expect(newLayer.columns.col1).toEqual(
          expect.objectContaining({
            operationType: 'filters',
            params: {
              filters: [
                {
                  input: {
                    language: 'kuery',
                    query: 'bytes: "A"',
                  },
                  label: 'A',
                },
                {
                  input: {
                    language: 'kuery',
                    query: 'bytes: "B"',
                  },
                  label: 'B',
                },
              ],
            },
          })
        );
      });
    });
  });

  describe('canAddNewField', () => {
    it("should reject if there's only sourceField but is not new", () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn('source'),
          sourceColumn: createMultiTermsColumn('source'),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(false);
    });

    it("should reject if there's no additional field to add", () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'bytes', 'dest']),
          sourceColumn: createMultiTermsColumn(['source', 'dest']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(false);
    });

    it('should reject if the passed field is already present', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('source')!;

      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn('source'),
          field,
          indexPattern,
        })
      ).toEqual(false);
    });

    it('should be positive if only the sourceField can be added', () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['bytes', 'dest']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(true);
    });

    it('should be positive if some field can be added', () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['dest', 'bytes', 'memory']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(true);
    });

    it('should be positive if the entire column can be added', () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['bytes', 'memory']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(true);
    });

    it('should reject if all fields can be added but will overpass the terms limit', () => {
      // limit is 5 terms
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['bytes', 'geo.src', 'dest', 'memory']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(false);
    });

    it('should be positive if the passed field is new', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('bytes')!;

      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn('source'),
          field,
          indexPattern,
        })
      ).toEqual(true);
    });

    it('should reject if the passed field is new but it will overpass the terms limit', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('bytes')!;

      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['bytes', 'geo.src', 'dest', 'memory', 'source']),
          field,
          indexPattern,
        })
      ).toEqual(false);
    });

    it('should reject if the passed field is a scripted field', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('scripted')!;

      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['bytes', 'source', 'dest', 'memory']),
          field,
          indexPattern,
        })
      ).toEqual(false);
    });

    it('should reject if the entire column has scripted field', () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['scripted', 'scripted']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(false);
    });

    it('should be positive if the entire column can be added (because ignoring scripted fields)', () => {
      expect(
        termsOperation.canAddNewField?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['bytes', 'memory', 'dest', 'scripted']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual(true);
    });
  });

  describe('getParamsForMultipleFields', () => {
    it('should return existing multiterms with multiple fields from source column', () => {
      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['bytes', 'memory']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['dest', 'bytes', 'memory']),
        parentFormat: { id: 'multi_terms' },
      });
    });

    it('should return existing multiterms with only new fields from source column', () => {
      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['bytes', 'dest']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['dest', 'bytes']),
        parentFormat: { id: 'multi_terms' },
      });
    });

    it('should return existing multiterms with only multiple new fields from source column', () => {
      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['dest', 'bytes', 'memory']),
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['dest', 'bytes', 'memory']),
        parentFormat: { id: 'multi_terms' },
      });
    });

    it('should append field to multiterms', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('bytes')!;

      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn('source'),
          field,
          indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['bytes']),
        parentFormat: { id: 'multi_terms' },
      });
    });

    it('should not append scripted field to multiterms', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('scripted')!;

      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn('source'),
          field,
          indexPattern,
        })
      ).toEqual({ secondaryFields: [], parentFormat: { id: 'terms' } });
    });

    it('should add both sourceColumn and field (as last term) to the targetColumn', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('bytes')!;
      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['memory']),
          field,
          indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['dest', 'memory', 'bytes']),
        parentFormat: { id: 'multi_terms' },
      });
    });

    it('should not add sourceColumn field if it has only scripted field', () => {
      const indexPattern = createMockedIndexPattern();
      const field = indexPattern.getFieldByName('bytes')!;
      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn: createMultiTermsColumn(['source', 'dest']),
          sourceColumn: createMultiTermsColumn(['scripted']),
          field,
          indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['dest', 'bytes']),
        parentFormat: { id: 'multi_terms' },
      });
    });

    it('should assign a parent formatter if a custom formatter is present', () => {
      const indexPattern = createMockedIndexPattern();

      const targetColumn = createMultiTermsColumn(['source', 'dest']);
      targetColumn.params.format = { id: 'bytes', params: { decimals: 2 } };
      expect(
        termsOperation.getParamsForMultipleFields?.({
          targetColumn,
          sourceColumn: createMultiTermsColumn(['scripted']),
          indexPattern,
        })
      ).toEqual({
        secondaryFields: expect.arrayContaining(['dest']),
        parentFormat: { id: 'multi_terms' },
      });
    });
  });

  describe('getNonTransferableFields', () => {
    it('should return empty array if all fields are transferable', () => {
      expect(
        termsOperation.getNonTransferableFields?.(
          createMultiTermsColumn(['source']),
          defaultProps.indexPattern
        )
      ).toEqual([]);
      expect(
        termsOperation.getNonTransferableFields?.(
          createMultiTermsColumn(['source', 'bytes']),
          defaultProps.indexPattern
        )
      ).toEqual([]);
      expect(
        termsOperation.getNonTransferableFields?.(
          createMultiTermsColumn([]),
          defaultProps.indexPattern
        )
      ).toEqual([]);
      expect(
        termsOperation.getNonTransferableFields?.(
          createMultiTermsColumn(['source', 'geo.src']),
          defaultProps.indexPattern
        )
      ).toEqual([]);
    });
    it('should return only non transferable fields (invalid or not existence)', () => {
      expect(
        termsOperation.getNonTransferableFields?.(
          createMultiTermsColumn(['source', 'timestamp']),
          defaultProps.indexPattern
        )
      ).toEqual(['timestamp']);
      expect(
        termsOperation.getNonTransferableFields?.(
          createMultiTermsColumn(['source', 'unsupported']),
          defaultProps.indexPattern
        )
      ).toEqual(['unsupported']);
    });
  });
});

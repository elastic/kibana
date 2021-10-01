/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow, mount } from 'enzyme';
import { EuiFieldNumber, EuiSelect, EuiSwitch } from '@elastic/eui';
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
import { termsOperation } from '../index';
import { IndexPattern, IndexPatternLayer } from '../../../types';
import { FrameDatasourceAPI } from '../../../../types';

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: createMockedIndexPattern(),
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

describe('terms', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = termsOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'source',
        },
        col2: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'Records',
          operationType: 'count',
        },
      },
    };
  });

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
        label: 'Top values of source',
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
        label: 'Top values of bytes',
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
      const newStringField = indexPattern.fields.find((i) => i.name === 'source')!;

      const column = termsOperation.onFieldChange(oldColumn, newStringField);
      expect(column).toHaveProperty('dataType', 'string');
      expect(column).toHaveProperty('sourceField', 'source');
      expect(column.params.format).toBeUndefined();
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
              sourceField: 'Records',
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
    it('should set alphabetical order type if metric column is of type last value', () => {
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
              },
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
        expect.objectContaining({ orderBy: { type: 'alphabetical', fallback: true } })
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
              sourceField: 'Records',
              operationType: 'count',
            },
          },
        },
        'col2',
        'col1'
      );

      expect(updatedColumn).toBe(initialColumn);
    });

    it('should switch to alphabetical ordering if metric is of type last_value', () => {
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
              },
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
              sourceField: 'Records',
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
            },
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
            },
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
            },
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
            },
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
              sourceField: 'Records',
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
                ...layer.columns.col1.params,
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
                ...layer.columns.col1.params,
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

      const select = instance
        .find('[data-test-subj="indexPattern-terms-orderDirection"]')
        .find(EuiSelect);

      expect(select.prop('value')).toEqual('asc');
      expect(select.prop('options')!.map(({ value }) => value)).toEqual(['asc', 'desc']);
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

      instance
        .find('[data-test-subj="indexPattern-terms-orderDirection"]')
        .find(EuiSelect)
        .simulate('change', {
          target: {
            value: 'desc',
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
            label: 'Top values of bytes',
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
          },
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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import { percentileOperation } from './index';
import { IndexPattern, IndexPatternLayer } from '../../types';
import { PercentileIndexPatternColumn } from './percentile';
import { EuiFieldNumber } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { EuiFormRow } from '@elastic/eui';

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: {
    ...createMockedIndexPattern(),
    hasRestrictions: false,
  } as IndexPattern,
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

describe('percentile', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = percentileOperation.paramEditor!;

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
          sourceField: 'category',
        },
        col2: {
          label: '23rd percentile of a',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'a',
          operationType: 'percentile',
          params: {
            percentile: 23,
          },
        },
      },
    };
  });

  describe('getPossibleOperationForField', () => {
    it('should accept number', () => {
      expect(
        percentileOperation.getPossibleOperationForField({
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          esTypes: ['long'],
          aggregatable: true,
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      });
    });

    it('should accept histogram', () => {
      expect(
        percentileOperation.getPossibleOperationForField({
          name: 'response_time',
          displayName: 'response_time',
          type: 'histogram',
          esTypes: ['histogram'],
          aggregatable: true,
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      });
    });

    it('should reject keywords', () => {
      expect(
        percentileOperation.getPossibleOperationForField({
          name: 'origin',
          displayName: 'origin',
          type: 'string',
          esTypes: ['keyword'],
          aggregatable: true,
        })
      ).toBeUndefined();
    });
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const percentileColumn = layer.columns.col2 as PercentileIndexPatternColumn;
      const esAggsFn = percentileOperation.toEsAggsFn(
        percentileColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            percentile: [23],
            field: ['a'],
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly to new field', () => {
      const oldColumn: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'bytes',
        label: '23rd percentile of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          percentile: 23,
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('memory')!;
      const column = percentileOperation.onFieldChange(oldColumn, newNumberField);

      expect(column).toEqual(
        expect.objectContaining({
          dataType: 'number',
          sourceField: 'memory',
          params: expect.objectContaining({
            percentile: 23,
          }),
        })
      );
      expect(column.label).toContain('memory');
    });
  });

  describe('buildColumn', () => {
    it('should set default percentile', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn({
        indexPattern,
        field: bytesField,
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(percentileColumn.dataType).toEqual('number');
      expect(percentileColumn.params.percentile).toEqual(95);
      expect(percentileColumn.label).toEqual('95th percentile of test');
    });

    it('should create a percentile from formula', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn(
        {
          indexPattern,
          field: bytesField,
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        },
        { percentile: 75 }
      );
      expect(percentileColumn.dataType).toEqual('number');
      expect(percentileColumn.params.percentile).toEqual(75);
      expect(percentileColumn.label).toEqual('75th percentile of test');
    });

    it('should create a percentile from formula with filter', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileColumn = percentileOperation.buildColumn(
        {
          indexPattern,
          field: bytesField,
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        },
        { percentile: 75, kql: 'bytes > 100' }
      );
      expect(percentileColumn.dataType).toEqual('number');
      expect(percentileColumn.params.percentile).toEqual(75);
      expect(percentileColumn.filter).toEqual({ language: 'kuery', query: 'bytes > 100' });
      expect(percentileColumn.label).toEqual('75th percentile of test');
    });
  });

  describe('isTransferable', () => {
    it('should transfer from number to histogram', () => {
      const indexPattern = createMockedIndexPattern();
      indexPattern.getFieldByName = jest.fn().mockReturnValue({
        name: 'response_time',
        displayName: 'response_time',
        type: 'histogram',
        esTypes: ['histogram'],
        aggregatable: true,
      });
      expect(
        percentileOperation.isTransferable(
          {
            label: '',
            sourceField: 'response_time',
            isBucketed: false,
            dataType: 'number',
            operationType: 'percentile',
            params: {
              percentile: 95,
            },
          },
          indexPattern,
          {}
        )
      ).toBeTruthy();
    });
  });

  describe('param editor', () => {
    it('should render current percentile', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      const input = instance.find('[data-test-subj="lns-indexPattern-percentile-input"]');

      expect(input.prop('value')).toEqual('23');
    });

    it('should update state on change', async () => {
      jest.useFakeTimers();
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      jest.runAllTimers();

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile-input"]')
        .find(EuiFieldNumber);

      await act(async () => {
        input.prop('onChange')!({ target: { value: '27' } } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      jest.runAllTimers();

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col2: {
            ...layer.columns.col2,
            params: {
              percentile: 27,
            },
            label: '27th percentile of a',
          },
        },
      });
    });

    it('should not update on invalid input, but show invalid value locally', async () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileIndexPatternColumn}
        />
      );

      jest.runAllTimers();

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile-input"]')
        .find(EuiFieldNumber);

      await act(async () => {
        input.prop('onChange')!({
          target: { value: '12.12' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      jest.runAllTimers();

      expect(updateLayerSpy).not.toHaveBeenCalled();

      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile-form"]')
          .find(EuiFormRow)
          .prop('isInvalid')
      ).toEqual(true);
      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile-input"]')
          .find(EuiFieldNumber)
          .prop('value')
      ).toEqual('12.12');
    });
  });
});

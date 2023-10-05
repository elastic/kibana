/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiFieldNumber } from '@elastic/eui';
import { IUiSettingsClient, HttpSetup } from '@kbn/core/public';
import { EuiFormRow } from '@elastic/eui';
import { shallow, mount } from 'enzyme';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import { percentileRanksOperation } from '.';
import { FormBasedLayer } from '../../types';
import type { PercentileRanksIndexPatternColumn } from './percentile_ranks';
import { TermsIndexPatternColumn } from './terms';
import { IndexPattern } from '../../../../types';

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
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
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

describe('percentile ranks', () => {
  let layer: FormBasedLayer;
  const InlineOptions = percentileRanksOperation.paramEditor!;

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
        } as TermsIndexPatternColumn,
        col2: {
          label: 'Percentile (100) of a',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'a',
          operationType: 'percentile_rank',
          params: {
            value: 100,
          },
        } as PercentileRanksIndexPatternColumn,
      },
    };
  });

  describe('getPossibleOperationForField', () => {
    it('should accept number', () => {
      expect(
        percentileRanksOperation.getPossibleOperationForField({
          name: 'bytes',
          displayName: 'bytes',
          type: 'number',
          esTypes: ['long'],
          searchable: true,
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
        percentileRanksOperation.getPossibleOperationForField({
          name: 'response_time',
          displayName: 'response_time',
          type: 'histogram',
          esTypes: ['histogram'],
          searchable: true,
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
        percentileRanksOperation.getPossibleOperationForField({
          name: 'origin',
          displayName: 'origin',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
        })
      ).toBeUndefined();
    });
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const percentileRanksColumn = layer.columns.col2 as PercentileRanksIndexPatternColumn;
      const esAggsFn = percentileRanksOperation.toEsAggsFn(
        percentileRanksColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            value: [100],
            field: ['a'],
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly to new field', () => {
      const oldColumn: PercentileRanksIndexPatternColumn = {
        operationType: 'percentile_rank',
        sourceField: 'bytes',
        label: 'Percentile rank (100) of bytes',
        isBucketed: true,
        dataType: 'number',
        params: {
          value: 100,
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('memory')!;
      const column = percentileRanksOperation.onFieldChange(oldColumn, newNumberField);

      expect(column).toEqual(
        expect.objectContaining({
          dataType: 'number',
          sourceField: 'memory',
          params: expect.objectContaining({
            value: 100,
          }),
        })
      );
      expect(column.label).toContain('memory');
    });
  });

  describe('buildColumn', () => {
    it('should set default percentile rank', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileRanksColumn = percentileRanksOperation.buildColumn({
        indexPattern,
        field: bytesField,
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(percentileRanksColumn.dataType).toEqual('number');
      expect(percentileRanksColumn.params.value).toEqual(0);
      expect(percentileRanksColumn.label).toEqual('Percentile rank (0) of test');
    });

    it('should create a percentile rank from formula', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileRanksColumn = percentileRanksOperation.buildColumn(
        {
          indexPattern,
          field: bytesField,
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        },
        { value: 1024 }
      );
      expect(percentileRanksColumn.dataType).toEqual('number');
      expect(percentileRanksColumn.params.value).toEqual(1024);
      expect(percentileRanksColumn.label).toEqual('Percentile rank (1024) of test');
    });

    it('should create a percentile rank from formula with filter', () => {
      const indexPattern = createMockedIndexPattern();
      const bytesField = indexPattern.fields.find(({ name }) => name === 'bytes')!;
      bytesField.displayName = 'test';
      const percentileRanksColumn = percentileRanksOperation.buildColumn(
        {
          indexPattern,
          field: bytesField,
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        },
        { value: 1024, kql: 'bytes > 100' }
      );
      expect(percentileRanksColumn.dataType).toEqual('number');
      expect(percentileRanksColumn.params.value).toEqual(1024);
      expect(percentileRanksColumn.filter).toEqual({ language: 'kuery', query: 'bytes > 100' });
      expect(percentileRanksColumn.label).toEqual('Percentile rank (1024) of test');
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
        percentileRanksOperation.isTransferable(
          {
            label: '',
            sourceField: 'response_time',
            isBucketed: false,
            dataType: 'number',
            operationType: 'percentile_rank',
            params: {
              value: 10,
            },
          },
          indexPattern,
          {}
        )
      ).toBeTruthy();
    });
  });

  describe('param editor', () => {
    it('should render current percentile rank', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileRanksIndexPatternColumn}
        />
      );

      const input = instance.find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]');

      expect(input.prop('value')).toEqual('100');
    });

    it('should update state on change', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileRanksIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]')
        .find(EuiFieldNumber);

      act(() => {
        input.prop('onChange')!({
          currentTarget: { value: '103' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer.columns.col2,
        params: {
          value: 103,
        },
        label: 'Percentile rank (103) of a',
      });
    });

    it('should not update on invalid input, but show invalid value locally', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileRanksIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]')
        .find(EuiFieldNumber);

      act(() => {
        input.prop('onChange')!({
          currentTarget: { value: 'miaou' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      expect(updateLayerSpy).not.toHaveBeenCalled();

      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile_ranks-form"]')
          .find(EuiFormRow)
          .prop('isInvalid')
      ).toEqual(true);
      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]')
          .find(EuiFieldNumber)
          .prop('value')
      ).toEqual('miaou');
    });

    it('should support decimals on dimension edit', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileRanksIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]')
        .find(EuiFieldNumber);

      act(() => {
        input.prop('onChange')!({
          currentTarget: { value: '10.5' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      expect(updateLayerSpy).toHaveBeenCalled();
    });

    it('should not support decimals on inline edit', () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as PercentileRanksIndexPatternColumn}
          paramEditorCustomProps={{ isInline: true }}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]')
        .find(EuiFieldNumber);

      act(() => {
        input.prop('onChange')!({
          currentTarget: { value: '10.5' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      expect(updateLayerSpy).not.toHaveBeenCalled();

      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile_ranks-form"]')
          .first()
          .prop('isInvalid')
      ).toEqual(true);
      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-percentile_ranks-input"]')
          .find(EuiFieldNumber)
          .prop('value')
      ).toEqual('10.5');
    });
  });
});

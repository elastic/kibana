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
import { unifiedSearchPluginMock } from '../../../../../../../src/plugins/unified_search/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import { staticValueOperation } from './index';
import { IndexPattern, IndexPatternLayer } from '../../types';
import { StaticValueIndexPatternColumn } from './static_value';
import { EuiFieldNumber } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { TermsIndexPatternColumn } from './terms';

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
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
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

describe('static_value', () => {
  let layer: IndexPatternLayer;

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
          label: 'Static value: 23',
          dataType: 'number',
          isBucketed: false,
          operationType: 'static_value',
          isStaticValue: true,
          references: [],
          params: {
            value: '23',
          },
        } as StaticValueIndexPatternColumn,
      },
    };
  });

  function getLayerWithStaticValue(newValue: string | null | undefined): IndexPatternLayer {
    return {
      ...layer,
      columns: {
        ...layer.columns,
        col2: {
          ...layer.columns.col2,
          label: `Static value: ${newValue ?? String(newValue)}`,
          params: {
            value: newValue,
          },
        } as StaticValueIndexPatternColumn,
      },
    };
  }

  describe('getDefaultLabel', () => {
    it('should return the label for the given value', () => {
      expect(
        staticValueOperation.getDefaultLabel(
          {
            label: 'Static value: 23',
            dataType: 'number',
            isBucketed: false,
            operationType: 'static_value',
            isStaticValue: true,
            references: [],
            params: {
              value: '23',
            },
          },
          createMockedIndexPattern(),
          layer.columns
        )
      ).toBe('Static value: 23');
    });

    it('should return the default label for non valid value', () => {
      expect(
        staticValueOperation.getDefaultLabel(
          {
            label: 'Static value',
            dataType: 'number',
            isBucketed: false,
            operationType: 'static_value',
            references: [],
            params: {
              value: '',
            },
          },
          createMockedIndexPattern(),
          layer.columns
        )
      ).toBe('Static value');
    });
  });

  describe('getErrorMessage', () => {
    it('should return no error for valid values', () => {
      expect(
        staticValueOperation.getErrorMessage!(
          getLayerWithStaticValue('23'),
          'col2',
          createMockedIndexPattern()
        )
      ).toBeUndefined();
      // test for potential falsy value
      expect(
        staticValueOperation.getErrorMessage!(
          getLayerWithStaticValue('0'),
          'col2',
          createMockedIndexPattern()
        )
      ).toBeUndefined();
    });

    it.each(['NaN', 'Infinity', 'string'])(
      'should return error for invalid values: %s',
      (value) => {
        expect(
          staticValueOperation.getErrorMessage!(
            getLayerWithStaticValue(value),
            'col2',
            createMockedIndexPattern()
          )
        ).toEqual(expect.arrayContaining([expect.stringMatching('is not a valid number')]));
      }
    );

    it.each([null, undefined])('should return no error for: %s', (value) => {
      expect(
        staticValueOperation.getErrorMessage!(
          getLayerWithStaticValue(value),
          'col2',
          createMockedIndexPattern()
        )
      ).toBe(undefined);
    });
  });

  describe('toExpression', () => {
    it('should return a mathColumn operation with valid value', () => {
      for (const value of ['23', '0', '-1']) {
        expect(
          staticValueOperation.toExpression(
            getLayerWithStaticValue(value),
            'col2',
            createMockedIndexPattern()
          )
        ).toEqual([
          {
            type: 'function',
            function: 'mathColumn',
            arguments: {
              id: ['col2'],
              name: [`Static value: ${value}`],
              expression: [value],
            },
          },
        ]);
      }
    });

    it('should fallback to mapColumn for invalid value', () => {
      for (const value of ['NaN', '', 'Infinity']) {
        expect(
          staticValueOperation.toExpression(
            getLayerWithStaticValue(value),
            'col2',
            createMockedIndexPattern()
          )
        ).toEqual([
          {
            type: 'function',
            function: 'mapColumn',
            arguments: {
              id: ['col2'],
              name: [`Static value`],
              expression: ['100'],
            },
          },
        ]);
      }
    });
  });

  describe('buildColumn', () => {
    it('should set default static value', () => {
      expect(
        staticValueOperation.buildColumn({
          indexPattern: createMockedIndexPattern(),
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        })
      ).toEqual({
        label: 'Static value',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '100' },
        references: [],
      });
    });

    it('should merge a previousColumn', () => {
      expect(
        staticValueOperation.buildColumn({
          indexPattern: createMockedIndexPattern(),
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
          previousColumn: {
            label: 'Static value',
            dataType: 'number',
            operationType: 'static_value',
            isStaticValue: true,
            isBucketed: false,
            scale: 'ratio',
            params: { value: '23' },
            references: [],
          } as StaticValueIndexPatternColumn,
        })
      ).toEqual({
        label: 'Static value: 23',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '23' },
        references: [],
      });
    });

    it('should create a static_value from passed arguments', () => {
      expect(
        staticValueOperation.buildColumn(
          {
            indexPattern: createMockedIndexPattern(),
            layer: { columns: {}, columnOrder: [], indexPatternId: '' },
          },
          { value: '23' }
        )
      ).toEqual({
        label: 'Static value: 23',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '23' },
        references: [],
      });
    });

    it('should prioritize passed arguments over previousColumn', () => {
      expect(
        staticValueOperation.buildColumn(
          {
            indexPattern: createMockedIndexPattern(),
            layer: { columns: {}, columnOrder: [], indexPatternId: '' },
            previousColumn: {
              label: 'Static value',
              dataType: 'number',
              operationType: 'static_value',
              isStaticValue: true,
              isBucketed: false,
              scale: 'ratio',
              params: { value: '23' },
              references: [],
            } as StaticValueIndexPatternColumn,
          },
          { value: '53' }
        )
      ).toEqual({
        label: 'Static value: 53',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '53' },
        references: [],
      });
    });
  });

  describe('paramEditor', () => {
    const ParamEditor = staticValueOperation.paramEditor!;
    it('should render current static_value', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <ParamEditor
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );

      const input = instance.find('[data-test-subj="lns-indexPattern-static_value-input"]');

      expect(input.prop('value')).toEqual('23');
    });

    it('should allow 0 as initial value', () => {
      const updateLayerSpy = jest.fn();
      const zeroLayer = {
        ...layer,
        columns: {
          ...layer.columns,
          col2: {
            ...layer.columns.col2,
            operationType: 'static_value',
            references: [],
            params: {
              value: '0',
            },
          } as StaticValueIndexPatternColumn,
        },
      } as IndexPatternLayer;
      const instance = shallow(
        <ParamEditor
          {...defaultProps}
          layer={zeroLayer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={zeroLayer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );

      const input = instance.find('[data-test-subj="lns-indexPattern-static_value-input"]');
      expect(input.prop('value')).toEqual('0');
    });

    it('should update state on change', async () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <ParamEditor
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-static_value-input"]')
        .find(EuiFieldNumber);

      await act(async () => {
        input.prop('onChange')!({
          currentTarget: { value: '27' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      expect(updateLayerSpy.mock.calls[0]).toEqual([expect.any(Function)]);
      // check that the result of the setter call is correct
      expect(updateLayerSpy.mock.calls[0][0](layer)).toEqual({
        ...layer,
        columns: {
          ...layer.columns,
          col2: {
            ...layer.columns.col2,
            params: {
              value: '27',
            },
            label: 'Static value: 27',
          },
        },
      });
    });

    it('should not update on invalid input, but show invalid value locally', async () => {
      const updateLayerSpy = jest.fn();
      const instance = mount(
        <ParamEditor
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );

      const input = instance
        .find('[data-test-subj="lns-indexPattern-static_value-input"]')
        .find(EuiFieldNumber);

      await act(async () => {
        input.prop('onChange')!({
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      instance.update();

      expect(updateLayerSpy).not.toHaveBeenCalled();
      expect(
        instance
          .find('[data-test-subj="lns-indexPattern-static_value-input"]')
          .find(EuiFieldNumber)
          .prop('value')
      ).toEqual('');
    });
  });
});

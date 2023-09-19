/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiComboBox } from '@elastic/eui';
import { GenericOperationDefinition } from '../operations';
import {
  averageOperation,
  countOperation,
  derivativeOperation,
  FieldBasedIndexPatternColumn,
  termsOperation,
  staticValueOperation,
  minOperation,
} from '../operations/definitions';
import { FieldInput, getErrorMessage } from './field_input';
import { createMockedIndexPattern, createMockedIndexPatternWithAdditionalFields } from '../mocks';
import { getOperationSupportMatrix } from '.';
import { GenericIndexPatternColumn, FormBasedLayer, FormBasedPrivateState } from '../types';
import { ReferenceBasedIndexPatternColumn } from '../operations/definitions/column_types';
import { FieldSelect } from './field_select';
import { IndexPattern, VisualizationDimensionGroupConfig } from '../../../types';

jest.mock('../operations/layer_helpers', () => {
  const original = jest.requireActual('../operations/layer_helpers');

  return {
    ...original,
    insertOrReplaceColumn: () => {
      return {} as FormBasedLayer;
    },
  };
});

const defaultProps = {
  indexPattern: createMockedIndexPattern(),
  currentFieldIsInvalid: false,
  incompleteField: null,
  incompleteOperation: undefined,
  incompleteParams: {},
  dimensionGroups: [] as VisualizationDimensionGroupConfig[],
  groupId: 'any',
  operationDefinitionMap: {
    terms: termsOperation,
    average: averageOperation,
    count: countOperation,
    differences: derivativeOperation,
    staticValue: staticValueOperation,
    min: minOperation,
  } as unknown as Record<string, GenericOperationDefinition>,
};

function getStringBasedOperationColumn(field = 'source'): FieldBasedIndexPatternColumn {
  return {
    label: `Top value of ${field}`,
    dataType: 'string',
    isBucketed: true,
    operationType: 'terms',
    params: {
      orderBy: { type: 'alphabetical' },
      size: 3,
      orderDirection: 'asc',
    },
    sourceField: field,
  } as FieldBasedIndexPatternColumn;
}

function getReferenceBasedOperationColumn(
  subOp = 'average',
  field = 'bytes'
): ReferenceBasedIndexPatternColumn {
  return {
    label: `Difference of ${subOp} of ${field}`,
    dataType: 'number',
    operationType: 'differences',
    isBucketed: false,
    references: ['colX'],
    scale: 'ratio',
  };
}

function getManagedBasedOperationColumn(): ReferenceBasedIndexPatternColumn {
  return {
    label: 'Static value: 100',
    dataType: 'number',
    operationType: 'static_value',
    isBucketed: false,
    scale: 'ratio',
    params: { value: 100 },
    references: [],
  } as ReferenceBasedIndexPatternColumn;
}

function getCountOperationColumn(): GenericIndexPatternColumn {
  return {
    label: 'Count',
    dataType: 'number',
    isBucketed: false,
    sourceField: '___records___',
    operationType: 'count',
  };
}
function getLayer(
  col1: GenericIndexPatternColumn = getStringBasedOperationColumn(),
  indexPattern?: IndexPattern
) {
  return {
    indexPatternId: defaultProps.indexPattern.id,
    columnOrder: ['col1', 'col2'],
    columns: {
      col1,
      col2: getCountOperationColumn(),
    },
  };
}
function getDefaultOperationSupportMatrix(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern?: IndexPattern
) {
  return getOperationSupportMatrix({
    state: {
      layers: { layer1: layer },
    } as unknown as FormBasedPrivateState,
    layerId: 'layer1',
    filterOperations: () => true,
    columnId,
    indexPatterns: {
      [defaultProps.indexPattern.id]: indexPattern ?? defaultProps.indexPattern,
    },
  });
}

const mockedReader = {
  hasFieldData: (dataViewId: string, fieldName: string) => {
    if (defaultProps.indexPattern.id !== dataViewId) {
      return false;
    }

    const map: Record<string, boolean> = {};
    for (const field of defaultProps.indexPattern.fields) {
      map[field.name] = true;
    }

    return map[fieldName];
  },
};

jest.mock('@kbn/unified-field-list/src/hooks/use_existing_fields', () => ({
  useExistingFieldsReader: jest.fn(() => mockedReader),
}));

describe('FieldInput', () => {
  it('should render a field select box', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
      />
    );

    expect(instance.find('[data-test-subj="indexPattern-dimension-field"]').exists()).toBeTruthy();
  });

  it('should render an error message when incomplete operation is on', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        incompleteOperation={'terms'}
        selectedColumn={getStringBasedOperationColumn()}
      />
    );

    expect(
      instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('isInvalid')
    ).toBeTruthy();

    expect(
      instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
    ).toBe('This field does not work with the selected function.');
  });

  it.each([
    ['reference-based operation', getReferenceBasedOperationColumn()],
    ['managed references operation', getManagedBasedOperationColumn()],
  ])(
    'should mark the field as invalid but not show any error message for a %s when only an incomplete column is set',
    (_, col: ReferenceBasedIndexPatternColumn) => {
      const updateLayerSpy = jest.fn();
      const layer = getLayer(col);
      const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
      const instance = mount(
        <FieldInput
          {...defaultProps}
          layer={layer}
          columnId={'col1'}
          updateLayer={updateLayerSpy}
          operationSupportMatrix={operationSupportMatrix}
          incompleteOperation={'terms'}
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
      ).toBe(undefined);
    }
  );

  it.each([
    ['reference-based operation', getReferenceBasedOperationColumn()],
    ['managed references operation', getManagedBasedOperationColumn()],
  ])(
    'should mark the field as invalid but and show an error message for a %s when an incomplete column is set and an existing column is selected',
    (_, col: ReferenceBasedIndexPatternColumn) => {
      const updateLayerSpy = jest.fn();
      const layer = getLayer(col);
      const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
      const instance = mount(
        <FieldInput
          {...defaultProps}
          layer={layer}
          columnId={'col1'}
          updateLayer={updateLayerSpy}
          operationSupportMatrix={operationSupportMatrix}
          selectedColumn={getStringBasedOperationColumn()}
          incompleteOperation={'terms'}
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
      ).toBe('This field does not work with the selected function.');
    }
  );

  it('should render an error message for invalid fields', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        currentFieldIsInvalid
      />
    );

    expect(
      instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('isInvalid')
    ).toBeTruthy();

    expect(
      instance.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
    ).toBe('Invalid field. Check your data view or pick another field.');
  });

  it('should render a help message when passed and no errors are found', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        helpMessage={'My help message'}
      />
    );

    expect(
      instance
        .find('[data-test-subj="indexPattern-field-selection-row"]')
        .first()
        .prop('labelAppend')
    ).toBe('My help message');
  });

  it('should prioritize errors over help messages', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        currentFieldIsInvalid
        helpMessage={'My help message'}
      />
    );

    expect(
      instance
        .find('[data-test-subj="indexPattern-field-selection-row"]')
        .first()
        .prop('labelAppend')
    ).not.toBe('My help message');
  });

  it('should update the layer on field selection', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        selectedColumn={getStringBasedOperationColumn()}
      />
    );

    act(() => {
      instance.find(EuiComboBox).first().prop('onChange')!([
        { value: { type: 'field', field: 'dest' }, label: 'dest' },
      ]);
    });

    expect(updateLayerSpy).toHaveBeenCalled();
  });

  it('should not trigger when the same selected field is selected again', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        selectedColumn={getStringBasedOperationColumn()}
      />
    );

    act(() => {
      instance.find(EuiComboBox).first().prop('onChange')!([
        { value: { type: 'field', field: 'source' }, label: 'source' },
      ]);
    });

    expect(updateLayerSpy).not.toHaveBeenCalled();
  });

  it('should prioritize incomplete fields over selected column field to display', () => {
    const updateLayerSpy = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        incompleteField={'dest'}
        selectedColumn={getStringBasedOperationColumn()}
      />
    );

    expect(instance.find(EuiComboBox).first().prop('selectedOptions')).toEqual([
      {
        label: 'dest',
        value: { type: 'field', field: 'dest' },
      },
    ]);
  });

  it('should forward the onDeleteColumn function', () => {
    const updateLayerSpy = jest.fn();
    const onDeleteColumn = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={updateLayerSpy}
        operationSupportMatrix={operationSupportMatrix}
        onDeleteColumn={onDeleteColumn}
      />
    );

    act(() => {
      instance.find(EuiComboBox).first().prop('onChange')!([]);
    });

    expect(onDeleteColumn).toHaveBeenCalled();
    expect(updateLayerSpy).not.toHaveBeenCalled();
  });

  describe('time series group', () => {
    function getLayerWithTSDBMetric() {
      const layer = getLayer();
      layer.columns.col2 = {
        label: 'Min of TSDB counter',
        dataType: 'number',
        isBucketed: false,
        sourceField: 'bytes_counter',
        operationType: 'min',
      };
      return layer;
    }
    it('should not render the time dimension category if it has tsdb metric column but the group is not a breakdown', () => {
      const updateLayerSpy = jest.fn();
      const layer = getLayerWithTSDBMetric();
      const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
      const instance = mount(
        <FieldInput
          {...defaultProps}
          indexPattern={createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])}
          layer={layer}
          columnId={'col1'}
          updateLayer={updateLayerSpy}
          operationSupportMatrix={operationSupportMatrix}
        />
      );

      expect(instance.find(FieldSelect).prop('showTimeSeriesDimensions')).toBeFalsy();
    });

    it('should render the time dimension category if it has tsdb metric column and the group is a breakdown one', () => {
      const updateLayerSpy = jest.fn();
      const layer = getLayerWithTSDBMetric();
      const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
      const instance = mount(
        <FieldInput
          {...defaultProps}
          indexPattern={createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])}
          dimensionGroups={defaultProps.dimensionGroups.concat([
            {
              groupId: 'breakdown',
              isBreakdownDimension: true,
            } as VisualizationDimensionGroupConfig,
          ])}
          groupId="breakdown"
          layer={layer}
          columnId={'col1'}
          updateLayer={updateLayerSpy}
          operationSupportMatrix={operationSupportMatrix}
        />
      );

      expect(instance.find(FieldSelect).prop('showTimeSeriesDimensions')).toBeTruthy();
    });
  });
});

describe('getErrorMessage', () => {
  it.each(['none', 'field', 'fullReference', 'managedReference'] as const)(
    'should return no error for no column passed for %s type of operation',
    (type) => {
      expect(getErrorMessage(undefined, false, type, false)).toBeUndefined();
    }
  );

  it('should return the invalid message', () => {
    expect(getErrorMessage(undefined, false, 'none', true)).toBe(
      'Invalid field. Check your data view or pick another field.'
    );
  });

  it('should ignore the invalid flag when an incomplete column is passed', () => {
    expect(
      getErrorMessage(
        { operationType: 'terms', label: 'Top values of X', dataType: 'string', isBucketed: true },
        true,
        'field',
        true
      )
    ).not.toBe('Invalid field. Check your data view or pick another field.');
  });

  it('should tell the user to change field if incomplete with an incompatible field', () => {
    expect(
      getErrorMessage(
        { operationType: 'terms', label: 'Top values of X', dataType: 'string', isBucketed: true },
        true,
        'field',
        false
      )
    ).toBe('This field does not work with the selected function.');
  });
});

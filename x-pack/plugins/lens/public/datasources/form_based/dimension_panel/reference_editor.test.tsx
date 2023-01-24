/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper, ShallowWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiComboBox } from '@elastic/eui';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { OperationMetadata } from '../../../types';
import { createMockedIndexPattern, createMockedIndexPatternWithoutType } from '../mocks';
import { ReferenceEditor, ReferenceEditorProps } from './reference_editor';
import {
  insertOrReplaceColumn,
  LastValueIndexPatternColumn,
  operationDefinitionMap,
  TermsIndexPatternColumn,
} from '../operations';
import { FieldSelect } from './field_select';
import { FormBasedLayer } from '../types';

jest.mock('@kbn/unified-field-list-plugin/public/hooks/use_existing_fields', () => ({
  useExistingFieldsReader: jest.fn(() => {
    return {
      hasFieldData: (dataViewId: string, fieldName: string) => {
        return ['timestamp', 'bytes', 'memory', 'source'].includes(fieldName);
      },
    };
  }),
}));

jest.mock('../operations');

describe('reference editor', () => {
  let wrapper: ReactWrapper | ShallowWrapper;
  let paramEditorUpdater: jest.Mock<ReferenceEditorProps['paramEditorUpdater']>;

  const layer = {
    indexPatternId: '1',
    columnOrder: ['ref'],
    columns: {
      ref: {
        label: 'Top values of dest',
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        sourceField: 'dest',
        params: { size: 5, orderBy: { type: 'alphabetical' }, orderDirection: 'desc' },
      } as TermsIndexPatternColumn,
    },
  };
  function getDefaultArgs() {
    return {
      layer,
      column: layer.columns.ref,
      onChooseField: jest.fn(),
      onChooseFunction: jest.fn(),
      onDeleteColumn: jest.fn(),
      columnId: 'ref',
      paramEditorUpdater,
      selectionStyle: 'full' as const,
      currentIndexPattern: createMockedIndexPattern(),
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      savedObjectsClient: {} as SavedObjectsClientContract,
      http: {} as HttpSetup,
      data: {} as DataPublicPluginStart,
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      unifiedSearch: {} as UnifiedSearchPublicPluginStart,
      dataViews: dataViewPluginMocks.createStartContract(),
      dimensionGroups: [],
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      setIsCloseable: jest.fn(),
      layerId: '1',
      operationDefinitionMap,
    };
  }

  beforeEach(() => {
    paramEditorUpdater = jest.fn().mockImplementation((newLayer) => {
      if (wrapper instanceof ReactWrapper) {
        wrapper.setProps({ layer: newLayer });
      }
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('should indicate that all functions and available fields are compatible in the empty state', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
        column={undefined}
      />
    );

    const functions = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]')
      .prop('options');

    expect(functions).not.toContainEqual(
      expect.objectContaining({ 'data-test-subj': expect.stringContaining('Incompatible') })
    );

    const fields = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    expect(fields![0].options).not.toContainEqual(
      expect.objectContaining({ 'data-test-subj': expect.stringContaining('Incompatible') })
    );
    expect(fields![1].options).not.toContainEqual(
      expect.objectContaining({ 'data-test-subj': expect.stringContaining('Incompatible') })
    );
  });

  it('should indicate fields that are incompatible with the current', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => !meta.isBucketed,
        }}
      />
    );

    const fields = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    const findFieldDataTestSubj = (l: string) => {
      return fields![0].options!.find(({ label }) => label === l)!['data-test-subj'];
    };
    expect(findFieldDataTestSubj('timestampLabel')).toContain('Incompatible');
    expect(findFieldDataTestSubj('source')).toContain('Incompatible');
    expect(findFieldDataTestSubj('memory')).toContain('lns-fieldOption-memory');
  });

  it('should indicate functions that are incompatible with the current', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Unique count of dest',
          dataType: 'string',
          isBucketed: false,
          operationType: 'unique_count',
          sourceField: 'dest',
        },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => !meta.isBucketed,
        }}
      />
    );

    const functions = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]')
      .prop('options');

    expect(functions.find(({ label }) => label === 'Average')!['data-test-subj']).toContain(
      'incompatible'
    );
  });

  it('should not update when selecting the same operation', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
      />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]');
    const option = comboBox.prop('options')!.find(({ label }) => label === 'Average')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });
    expect(insertOrReplaceColumn).not.toHaveBeenCalled();
  });

  it('should keep the field when replacing an existing reference with a compatible function', () => {
    const onChooseFunction = jest.fn();
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
        onChooseFunction={onChooseFunction}
      />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]');
    const option = comboBox.prop('options')!.find(({ label }) => label === 'Maximum')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(onChooseFunction).toHaveBeenCalledWith(
      'max',
      expect.objectContaining({
        name: 'bytes',
      })
    );
  });

  it('should transition to another function with incompatible field', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Unique count of dest',
          dataType: 'string',
          isBucketed: false,
          operationType: 'unique_count',
          sourceField: 'dest',
        },
      },
    } as FormBasedLayer;
    const onChooseFunction = jest.fn();
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        onChooseFunction={onChooseFunction}
        column={newLayer.columns.ref}
        layer={newLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]');
    const option = comboBox.prop('options')!.find(({ label }) => label === 'Average')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(onChooseFunction).toHaveBeenCalledWith('average', undefined);
  });

  it("should show the sub-function as invalid if there's no field compatible with it", () => {
    // This may happen for saved objects after changing the type of a field
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        currentIndexPattern={createMockedIndexPatternWithoutType('number')}
        column={newLayer.columns.ref}
        layer={newLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const subFunctionSelect = wrapper
      .find('[data-test-subj="indexPattern-reference-function"]')
      .first();

    expect(subFunctionSelect.prop('isInvalid')).toEqual(true);
    expect(subFunctionSelect.prop('selectedOptions')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-test-subj': 'lns-indexPatternDimension-average incompatible',
          label: 'Average',
          value: 'average',
        }),
      ])
    );
  });

  it('should not display hidden sub-function types', () => {
    // This may happen for saved objects after changing the type of a field
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={undefined}
        currentIndexPattern={createMockedIndexPatternWithoutType('number')}
        validation={{
          input: ['field', 'fullReference', 'managedReference'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const subFunctionSelect = wrapper
      .find('[data-test-subj="indexPattern-reference-function"]')
      .first();
    expect(subFunctionSelect.prop('isInvalid')).toEqual(true);

    expect(subFunctionSelect.prop('selectedOptions')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'math' })])
    );
    expect(subFunctionSelect.prop('selectedOptions')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'formula' })])
    );
  });

  it('should hide the function selector when using a field-only selection style', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={undefined}
        selectionStyle={'field' as const}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]');
    expect(comboBox).toHaveLength(0);
  });

  it('should pass the incomplete operation info to FieldSelect', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
      incompleteColumns: {
        ref: { operationType: 'max' },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        incompleteColumn={newLayer.incompleteColumns?.ref}
        column={newLayer.columns.ref}
        layer={newLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const fieldSelect = wrapper.find(FieldSelect);
    expect(fieldSelect.prop('fieldIsInvalid')).toEqual(true);
    expect(fieldSelect.prop('selectedField')).toEqual('bytes');
    expect(fieldSelect.prop('selectedOperationType')).toEqual('average');
    expect(fieldSelect.prop('incompleteOperation')).toEqual('max');
    expect(fieldSelect.prop('markAllFieldsCompatible')).toEqual(false);
  });

  it('should pass the incomplete field info to FieldSelect', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
      incompleteColumns: {
        ref: { sourceField: 'timestamp' },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        incompleteColumn={newLayer.incompleteColumns?.ref}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const fieldSelect = wrapper.find(FieldSelect);
    expect(fieldSelect.prop('fieldIsInvalid')).toEqual(false);
    expect(fieldSelect.prop('selectedField')).toEqual('timestamp');
    expect(fieldSelect.prop('selectedOperationType')).toEqual('average');
    expect(fieldSelect.prop('incompleteOperation')).toBeUndefined();
  });

  it('should show the FieldSelect as invalid in the empty state for field-only forms', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={undefined}
        selectionStyle="field"
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const fieldSelect = wrapper.find(FieldSelect);
    expect(fieldSelect.prop('fieldIsInvalid')).toEqual(true);
    expect(fieldSelect.prop('selectedField')).toBeUndefined();
    expect(fieldSelect.prop('selectedOperationType')).toBeUndefined();
    expect(fieldSelect.prop('incompleteOperation')).toBeUndefined();
    expect(fieldSelect.prop('markAllFieldsCompatible')).toEqual(true);
  });

  it('should show the FieldSelect as invalid if the selected field is missing', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of missing',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'missing',
        },
      },
    } as FormBasedLayer;
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const fieldSelect = wrapper.find(FieldSelect);
    expect(fieldSelect.prop('fieldIsInvalid')).toEqual(true);
    expect(fieldSelect.prop('selectedField')).toEqual('missing');
    expect(fieldSelect.prop('selectedOperationType')).toEqual('average');
    expect(fieldSelect.prop('incompleteOperation')).toBeUndefined();
    expect(fieldSelect.prop('markAllFieldsCompatible')).toEqual(false);
  });

  it('should show the ParamEditor for functions that offer one', () => {
    const lastValueLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Last value of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'last_value',
          sourceField: 'bytes',
          params: {
            sortField: 'timestamp',
          },
        } as LastValueIndexPatternColumn,
      },
    };
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={lastValueLayer.columns.ref}
        layer={lastValueLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(wrapper.find('[data-test-subj="lns-indexPattern-lastValue-sortField"]').exists()).toBe(
      true
    );
  });

  it('should hide the ParamEditor for incomplete functions', () => {
    const lastValueLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Last value of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'last_value',
          sourceField: 'bytes',
          params: {
            sortField: 'timestamp',
          },
        } as LastValueIndexPatternColumn,
      },
      incompleteColumns: {
        ref: { operationType: 'max' },
      },
    };
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        incompleteColumn={lastValueLayer.incompleteColumns.ref}
        column={lastValueLayer.columns.ref}
        layer={lastValueLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(wrapper.find('[data-test-subj="lns-indexPattern-lastValue-sortField"]').exists()).toBe(
      false
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper, ShallowWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiComboBox } from '@elastic/eui';
import { mountWithIntl as mount } from '@kbn/test/jest';
import { OperationMetadata } from '../../types';
import { createMockedIndexPattern } from '../mocks';
import { ReferenceEditor, ReferenceEditorProps } from './reference_editor';
import { insertOrReplaceColumn } from '../operations';
import { FieldSelect } from './field_select';

jest.mock('../operations');

describe('reference editor', () => {
  let wrapper: ReactWrapper | ShallowWrapper;
  let updateLayer: jest.Mock<ReferenceEditorProps['updateLayer']>;

  function getDefaultArgs() {
    return {
      layer: {
        indexPatternId: '1',
        columns: {},
        columnOrder: [],
      },
      columnId: 'ref',
      updateLayer,
      selectionStyle: 'full' as const,
      currentIndexPattern: createMockedIndexPattern(),
      existingFields: {
        'my-fake-index-pattern': {
          timestamp: true,
          bytes: true,
          memory: true,
          source: true,
        },
      },
    };
  }

  beforeEach(() => {
    updateLayer = jest.fn().mockImplementation((newLayer) => {
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

  it('should indicate functions and fields that are incompatible with the current', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={{
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
            },
          },
        }}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.isBucketed,
        }}
      />
    );

    const functions = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]')
      .prop('options');
    expect(functions.find(({ label }) => label === 'Date histogram')!['data-test-subj']).toContain(
      'incompatible'
    );

    const fields = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');
    expect(
      fields![0].options!.find(({ label }) => label === 'timestampLabel')!['data-test-subj']
    ).toContain('Incompatible');
  });

  it('should not update when selecting the same operation', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={{
          indexPatternId: '1',
          columnOrder: ['ref'],
          columns: {
            ref: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,
              operationType: 'avg',
              sourceField: 'bytes',
            },
          },
        }}
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
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={{
          indexPatternId: '1',
          columnOrder: ['ref'],
          columns: {
            ref: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,
              operationType: 'avg',
              sourceField: 'bytes',
            },
          },
        }}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
      />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]');
    const option = comboBox.prop('options')!.find(({ label }) => label === 'Maximum')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(insertOrReplaceColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'max',
        field: expect.objectContaining({ name: 'bytes' }),
      })
    );
  });

  it('should transition to another function with incompatible field', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={{
          indexPatternId: '1',
          columnOrder: ['ref'],
          columns: {
            ref: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,
              operationType: 'avg',
              sourceField: 'bytes',
            },
          },
        }}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-reference-function"]');
    const option = comboBox.prop('options')!.find(({ label }) => label === 'Date histogram')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(insertOrReplaceColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'date_histogram',
        field: undefined,
      })
    );
  });

  it('should hide the function selector when using a field-only selection style', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
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
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={{
          indexPatternId: '1',
          columnOrder: ['ref'],
          columns: {
            ref: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,
              operationType: 'avg',
              sourceField: 'bytes',
            },
          },
          incompleteColumns: {
            ref: { operationType: 'max' },
          },
        }}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const fieldSelect = wrapper.find(FieldSelect);
    expect(fieldSelect.prop('fieldIsInvalid')).toEqual(false);
    expect(fieldSelect.prop('selectedField')).toEqual('bytes');
    expect(fieldSelect.prop('selectedOperationType')).toEqual('avg');
    expect(fieldSelect.prop('incompleteOperation')).toEqual('max');
  });

  it('should pass the incomplete field info to FieldSelect', () => {
    wrapper = mount(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={{
          indexPatternId: '1',
          columnOrder: ['ref'],
          columns: {
            ref: {
              label: 'Average of bytes',
              dataType: 'number',
              isBucketed: false,
              operationType: 'avg',
              sourceField: 'bytes',
            },
          },
          incompleteColumns: {
            ref: { sourceField: 'timestamp' },
          },
        }}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    const fieldSelect = wrapper.find(FieldSelect);
    expect(fieldSelect.prop('fieldIsInvalid')).toEqual(false);
    expect(fieldSelect.prop('selectedField')).toEqual('timestamp');
    expect(fieldSelect.prop('selectedOperationType')).toEqual('avg');
    expect(fieldSelect.prop('incompleteOperation')).toBeUndefined();
  });
});

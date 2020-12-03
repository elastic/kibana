/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper, ShallowWrapper } from 'enzyme';
import { EuiComboBox } from '@elastic/eui';
import { mountWithIntl as mount } from '@kbn/test/jest';
import { OperationMetadata } from '../../types';
import { createMockedIndexPattern } from '../mocks';
import { ReferenceEditor, ReferenceEditorProps } from './reference_editor';

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
});

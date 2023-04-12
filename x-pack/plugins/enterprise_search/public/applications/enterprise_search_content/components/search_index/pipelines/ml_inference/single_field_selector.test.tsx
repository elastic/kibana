/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText, EuiSelect } from '@elastic/eui';

import { SingleFieldMapping } from './single_field_selector';

const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: {
      sourceField: 'my-source-field',
      destinationField: 'my-target-field',
    },
  },
  formErrors: {},
  sourceFields: ['my-source-field1', 'my-source-field2', 'my-source-field3'],
  supportedMLModels: [],
};

describe('SingleFieldMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });
  it('renders source field selector and target field text field', () => {
    setMockValues(DEFAULT_VALUES);
    const wrapper = shallow(<SingleFieldMapping />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
    const select = wrapper.find(EuiSelect);
    expect(select.prop('options')).toEqual([
      {
        disabled: true,
        text: 'Select a schema field',
        value: '',
      },
      {
        text: 'my-source-field1',
        value: 'my-source-field1',
      },
      {
        text: 'my-source-field2',
        value: 'my-source-field2',
      },
      {
        text: 'my-source-field3',
        value: 'my-source-field3',
      },
    ]);
    expect(select.prop('value')).toEqual('my-source-field');

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    const textField = wrapper.find(EuiFieldText);
    expect(textField.prop('value')).toEqual('my-target-field');
  });
  it('disables inputs when selecting an existing pipeline', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        configuration: {
          ...DEFAULT_VALUES.addInferencePipelineModal.configuration,
          existingPipeline: true,
        },
      },
    });
    const wrapper = shallow(<SingleFieldMapping />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
    const select = wrapper.find(EuiSelect);
    expect(select.prop('disabled')).toBe(true);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    const textField = wrapper.find(EuiFieldText);
    expect(textField.prop('disabled')).toBe(true);
  });
});

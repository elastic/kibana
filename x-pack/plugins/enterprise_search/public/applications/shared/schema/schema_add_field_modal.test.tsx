/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, mount } from 'enzyme';

import { EuiFieldText, EuiModal } from '@elastic/eui';

import { FIELD_NAME_CORRECTED_PREFIX } from './constants';
import { SchemaType } from './types';

import { SchemaFieldTypeSelect, SchemaAddFieldModal } from './';

describe('SchemaAddFieldModal', () => {
  const addNewField = jest.fn();
  const closeAddFieldModal = jest.fn();

  const props = {
    addNewField,
    closeAddFieldModal,
  };

  const errors = {
    addFieldFormErrors: ['error1', 'error2'],
  };

  const setState = jest.fn();
  const setStateMock: any = (initState: any) => [initState, setState];

  beforeEach(() => {
    jest.spyOn(React, 'useState').mockImplementationOnce(setStateMock);
    setState(false);
  });

  it('renders', () => {
    const wrapper = shallow(<SchemaAddFieldModal {...props} />);
    expect(wrapper.find(EuiModal)).toHaveLength(1);
  });

  it('sets loading state in useEffect', () => {
    setState(true);
    const wrapper = mount(<SchemaAddFieldModal {...props} />);
    wrapper.setProps({ ...errors });
    const input = wrapper.find(EuiFieldText);

    expect(input.prop('isLoading')).toEqual(false);
    expect(setState).toHaveBeenCalledTimes(3);
    expect(setState).toHaveBeenCalledWith(false);
  });

  it('handles input change - with non-formatted name', () => {
    jest.spyOn(React, 'useState').mockImplementationOnce(setStateMock);
    const wrapper = shallow(<SchemaAddFieldModal {...props} />);
    const input = wrapper.find(EuiFieldText);
    input.simulate('change', { currentTarget: { value: 'foobar' } });

    expect(wrapper.find('[data-test-subj="SchemaAddFieldNameRow"]').prop('helpText')).toEqual(
      'Field names can only contain lowercase letters, numbers, and underscores'
    );
  });

  it('handles input change - with formatted name', () => {
    jest.spyOn(React, 'useState').mockImplementationOnce(setStateMock);
    const wrapper = shallow(<SchemaAddFieldModal {...props} />);
    const input = wrapper.find(EuiFieldText);
    input.simulate('change', { currentTarget: { value: 'foo-bar' } });

    expect(wrapper.find('[data-test-subj="SchemaAddFieldNameRow"]').prop('helpText')).toEqual(
      <React.Fragment>
        {FIELD_NAME_CORRECTED_PREFIX} <strong>foo_bar</strong>
      </React.Fragment>
    );
  });

  it('handles field type select change', () => {
    const wrapper = shallow(<SchemaAddFieldModal {...props} />);
    const fieldTypeUpdate = wrapper.find(SchemaFieldTypeSelect).prop('updateExistingFieldType');

    fieldTypeUpdate('_', SchemaType.Number); // The fieldName arg is irrelevant for this modal

    expect(wrapper.find(SchemaFieldTypeSelect).prop('fieldType')).toEqual(SchemaType.Number);
  });

  it('handles form submission', () => {
    jest.spyOn(React, 'useState').mockImplementationOnce(setStateMock);
    const wrapper = shallow(<SchemaAddFieldModal {...props} />);
    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(addNewField).toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });
});

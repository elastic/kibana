/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { NUMBER } from '../constants/field_types';

import { FIELD_NAME_CORRECTED_PREFIX } from './constants';

import { SchemaAddFieldModal } from './';

import { EuiFieldText, EuiModal, EuiSelect } from '@elastic/eui';

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

  // No matter what I try I can't get this to actually achieve coverage.
  it('sets loading state in useEffect', () => {
    setState(true);
    const wrapper = mount(<SchemaAddFieldModal {...props} {...errors} />);
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

  it('handles option change', () => {
    const wrapper = shallow(<SchemaAddFieldModal {...props} />);
    wrapper.find(EuiSelect).simulate('change', { target: { value: NUMBER } });

    expect(wrapper.find('[data-test-subj="SchemaSelect"]').prop('value')).toEqual(NUMBER);
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

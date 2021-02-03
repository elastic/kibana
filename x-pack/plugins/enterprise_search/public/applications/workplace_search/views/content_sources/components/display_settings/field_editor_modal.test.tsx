/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__';
import { shallow } from 'enzyme';

import React from 'react';

import { EuiModal, EuiSelect, EuiFieldText } from '@elastic/eui';

import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import { FieldEditorModal } from './field_editor_modal';

describe('FieldEditorModal', () => {
  const { searchResultConfig } = exampleResult;
  const fieldOptions = [
    {
      value: 'foo',
      text: 'Foo',
    },
  ];
  const availableFieldOptions = [
    {
      value: 'bar',
      text: 'Bar',
    },
  ];
  const toggleFieldEditorModal = jest.fn();
  const addDetailField = jest.fn();
  const updateDetailField = jest.fn();

  beforeEach(() => {
    setMockActions({
      toggleFieldEditorModal,
      addDetailField,
      updateDetailField,
    });
    setMockValues({
      searchResultConfig,
      fieldOptions,
      availableFieldOptions,
      editFieldIndex: 0,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<FieldEditorModal />);

    expect(wrapper.find(EuiModal)).toHaveLength(1);
  });

  it('sets value on select change', () => {
    const wrapper = shallow(<FieldEditorModal />);
    const select = wrapper.find(EuiSelect);

    select.simulate('change', { target: { value: 'cats' } });

    expect(select.prop('value')).toEqual('cats');
  });

  it('sets value on input change', () => {
    const wrapper = shallow(<FieldEditorModal />);
    const input = wrapper.find(EuiFieldText);

    input.simulate('change', { target: { value: 'Felines' } });

    expect(input.prop('value')).toEqual('Felines');
  });

  it('handles form submission when creating', () => {
    setMockValues({
      searchResultConfig,
      fieldOptions,
      availableFieldOptions,
      editFieldIndex: null,
    });

    const wrapper = shallow(<FieldEditorModal />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(addDetailField).toHaveBeenCalled();
  });

  it('handles form submission when editing', () => {
    const wrapper = shallow(<FieldEditorModal />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(updateDetailField).toHaveBeenCalled();
  });
});

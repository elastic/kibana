/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { CustomizationModal } from './customization_modal';

describe('CustomizationModal', () => {
  const props = {
    filterFields: ['field1', 'field2'],
    sortFields: ['sortField1', 'sortField2'],
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  const values = {
    engine: {
      name: 'some-engine',
      apiKey: '1234',
    },
  };

  const actions = {
    setEngine: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CustomizationModal {...props} />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('when save is clicked, it calls onSave prop with selected filter and sort fields', () => {
    const wrapper = shallow(<CustomizationModal {...props} />);
    wrapper.find(EuiButton).simulate('click');
    expect(props.onSave).toHaveBeenCalledWith({
      filterFields: ['field1', 'field2'],
      sortFields: ['sortField1', 'sortField2'],
    });
  });

  it('when save is clicked, it calls onSave prop when with updated selections', () => {
    const wrapper = shallow(<CustomizationModal {...props} />);

    const sortFieldsDropdown = wrapper.find('[data-test-subj="sortFieldsDropdown"]');
    sortFieldsDropdown.simulate('change', [{ label: 'newSort1' }]);

    const filterFieldsDropdown = wrapper.find('[data-test-subj="filterFieldsDropdown"]');
    filterFieldsDropdown.simulate('change', [{ label: 'newField1' }]);

    wrapper.find(EuiButton).simulate('click');
    expect(props.onSave).toHaveBeenCalledWith({
      filterFields: ['newField1'],
      sortFields: ['newSort1'],
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const wrapper = shallow(<CustomizationModal {...props} />);
    wrapper.find(EuiButtonEmpty).simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });
});

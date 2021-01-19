/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AddGroupModal } from './add_group_modal';

import { EuiModal, EuiOverlayMask } from '@elastic/eui';

describe('AddGroupModal', () => {
  const closeNewGroupModal = jest.fn();
  const saveNewGroup = jest.fn();
  const setNewGroupName = jest.fn();

  beforeEach(() => {
    setMockValues({
      newGroupNameErrors: [],
      newGroupName: 'foo',
    });

    setMockActions({
      closeNewGroupModal,
      saveNewGroup,
      setNewGroupName,
    });
  });
  it('renders', () => {
    const wrapper = shallow(<AddGroupModal />);

    expect(wrapper.find(EuiModal)).toHaveLength(1);
    expect(wrapper.find(EuiOverlayMask)).toHaveLength(1);
  });

  it('updates the input value', () => {
    const wrapper = shallow(<AddGroupModal />);

    const input = wrapper.find('[data-test-subj="AddGroupInput"]');
    input.simulate('change', { target: { value: 'bar' } });

    expect(setNewGroupName).toHaveBeenCalledWith('bar');
  });

  it('submits the form', () => {
    const wrapper = shallow(<AddGroupModal />);

    const simulatedEvent = {
      form: 0,
      target: { getAttribute: () => '_self' },
      preventDefault: jest.fn(),
    };

    const form = wrapper.find('form');
    form.simulate('submit', simulatedEvent);
    expect(simulatedEvent.preventDefault).toHaveBeenCalled();
    expect(saveNewGroup).toHaveBeenCalled();
  });
});

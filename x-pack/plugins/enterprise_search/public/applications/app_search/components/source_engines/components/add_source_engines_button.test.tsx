/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { AddSourceEnginesButton } from './add_source_engines_button';

describe('AddSourceEnginesButton', () => {
  const MOCK_ACTIONS = {
    openModal: jest.fn(),
  };

  it('opens the modal on click', () => {
    setMockActions(MOCK_ACTIONS);

    const wrapper = shallow(<AddSourceEnginesButton />);
    const button = wrapper.find(EuiButton);

    expect(button).toHaveLength(1);

    button.simulate('click');

    expect(MOCK_ACTIONS.openModal).toHaveBeenCalled();
  });
});

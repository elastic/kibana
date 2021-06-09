/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { MultiInputRows } from '../../multi_input_rows';

import { CurationCreation } from './curation_creation';

describe('CurationCreation', () => {
  const actions = {
    createCuration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CurationCreation />);

    expect(wrapper.find(MultiInputRows)).toHaveLength(1);
  });

  it('calls createCuration on submit', () => {
    const wrapper = shallow(<CurationCreation />);
    wrapper.find(MultiInputRows).simulate('submit', ['some query']);

    expect(actions.createCuration).toHaveBeenCalledWith(['some query']);
  });
});

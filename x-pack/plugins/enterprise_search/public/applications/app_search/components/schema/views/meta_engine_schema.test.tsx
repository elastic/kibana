/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__';
import '../../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { Loading } from '../../../../shared/loading';

import { MetaEngineSchema } from './';

describe('MetaEngineSchema', () => {
  const values = {
    dataLoading: false,
  };
  const actions = {
    loadSchema: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<MetaEngineSchema />);

    expect(wrapper.isEmptyRender()).toBe(false);
    // TODO: Check for schema components
  });

  it('calls loadSchema on mount', () => {
    shallow(<MetaEngineSchema />);

    expect(actions.loadSchema).toHaveBeenCalled();
  });

  it('renders a loading state', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<MetaEngineSchema />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });
});

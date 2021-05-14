/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import { setMockActions } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { SearchUI } from './';

describe('SearchUI', () => {
  const actions = {
    loadFieldData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders', () => {
    shallow(<SearchUI />);
    // TODO: Check for form
  });

  it('initializes data on mount', () => {
    shallow(<SearchUI />);
    expect(actions.loadFieldData).toHaveBeenCalledTimes(1);
  });
});

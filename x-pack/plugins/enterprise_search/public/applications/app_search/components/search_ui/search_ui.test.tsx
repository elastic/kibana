/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import { mockEngineValues } from '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SearchUIForm } from './components/search_ui_form';
import { SearchUIGraphic } from './components/search_ui_graphic';

import { SearchUI } from '.';

describe('SearchUI', () => {
  const actions = {
    loadFieldData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    setMockValues(mockEngineValues);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchUI />);
    expect(wrapper.find(SearchUIForm).exists()).toBe(true);
    expect(wrapper.find(SearchUIGraphic).exists()).toBe(true);
  });

  it('initializes data on mount', () => {
    shallow(<SearchUI />);
    expect(actions.loadFieldData).toHaveBeenCalledTimes(1);
  });
});

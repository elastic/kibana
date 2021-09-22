/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { CurationsSettings } from './curations_settings';

describe('CurationsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty', () => {
    const wrapper = shallow(<CurationsSettings />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});

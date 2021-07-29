/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { ActiveField } from '../types';

import { SearchUIGraphic } from './search_ui_graphic';

describe('SearchUIGraphic', () => {
  const values = {
    activeField: ActiveField.Sort,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders an svg with a className determined by the currently active field', () => {
    const wrapper = shallow(<SearchUIGraphic />);
    expect(wrapper.hasClass('activeSort')).toBe(true);
  });
});

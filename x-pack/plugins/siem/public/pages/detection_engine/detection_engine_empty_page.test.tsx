/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
jest.mock('../../lib/kibana');

describe('DetectionEngineEmptyPage', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<DetectionEngineEmptyPage />);

    expect(wrapper.find('EmptyPage')).toHaveLength(1);
  });
});

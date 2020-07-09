/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { DetectionEngineNoIndex } from './detection_engine_no_signal_index';
jest.mock('../../../common/lib/kibana');

describe('DetectionEngineNoIndex', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<DetectionEngineNoIndex />);

    expect(wrapper.find('EmptyPage')).toHaveLength(1);
  });
});

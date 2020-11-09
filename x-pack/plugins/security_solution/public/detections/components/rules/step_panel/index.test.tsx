/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { StepPanel } from './index';

describe('StepPanel', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <StepPanel loading={false} title="Title">
        <div />
      </StepPanel>
    );

    expect(wrapper.find('MyPanel')).toHaveLength(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { StickyContainer } from 'react-sticky';

import Timeline from '../index';
import props from './props.json';
import { mockMoment, toJson } from '../../../../../utils/testHelpers';

describe('Timline', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render with data', () => {
    const wrapper = mount(
      <StickyContainer>
        <Timeline header={<div>Hello - i am a header</div>} {...props} />
      </StickyContainer>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

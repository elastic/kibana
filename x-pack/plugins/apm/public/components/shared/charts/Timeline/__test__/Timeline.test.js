/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { StickyContainer } from 'react-sticky';

import Timeline from '../index';
import { mockMoment, toJson } from '../../../../../utils/testHelpers';

describe('Timeline', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render with data', () => {
    const props = {
      traceRootDuration: 200000,
      width: 1000,
      duration: 200000,
      height: 116,
      margins: {
        top: 100,
        left: 50,
        right: 50,
        bottom: 0
      },
      animation: null,
      agentMarks: [
        { name: 'timeToFirstByte', us: 100000 },
        { name: 'domInteractive', us: 110000 },
        { name: 'domComplete', us: 190000 }
      ]
    };

    const wrapper = mount(
      <StickyContainer>
        <Timeline {...props} />
      </StickyContainer>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

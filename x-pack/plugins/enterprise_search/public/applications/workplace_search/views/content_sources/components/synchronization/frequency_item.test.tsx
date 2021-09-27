/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldNumber, EuiSuperSelect } from '@elastic/eui';

import { FrequencyItem } from './frequency_item';

describe('FrequencyItem', () => {
  const props = {
    label: 'Item',
    description: 'My item',
    duration: 'PT2D',
    estimate: {
      duration: 'PT3D',
      nextStart: '2021-09-27T21:39:24+00:00',
      lastRun: '2021-09-25T21:39:24+00:00',
    },
  };
  it('renders', () => {
    const wrapper = shallow(<FrequencyItem {...props} />);

    expect(wrapper.find(EuiSuperSelect)).toHaveLength(1);
    expect(wrapper.find(EuiFieldNumber)).toHaveLength(1);
  });
});

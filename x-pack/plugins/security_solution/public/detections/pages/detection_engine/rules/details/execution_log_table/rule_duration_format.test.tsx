/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { RuleDurationFormat } from './rule_duration_format';

// TODO: Replace snapshot test with base test cases

describe('RuleDurationFormat', () => {
  describe('snapshots', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<RuleDurationFormat duration={0} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});

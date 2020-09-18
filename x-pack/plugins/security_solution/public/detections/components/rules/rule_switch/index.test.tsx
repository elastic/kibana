/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { RuleSwitchComponent } from './index';

describe('RuleSwitch', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <RuleSwitchComponent optionLabel="rule-switch" enabled={true} id={'7'} isLoading={false} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});

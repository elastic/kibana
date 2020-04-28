/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { RuleStatus } from './index';

describe('RuleStatus', () => {
  it('renders loader correctly', () => {
    const wrapper = shallow(<RuleStatus ruleId="ruleId" ruleEnabled={true} />);

    expect(wrapper.dive().find('[data-test-subj="rule-status-loader"]')).toHaveLength(1);
  });
});

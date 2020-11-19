/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { RuleStatusIcon } from './index';
jest.mock('../../../../common/lib/kibana');

describe('RuleStatusIcon', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<RuleStatusIcon name="name" type="active" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EuiAvatar')).toHaveLength(1);
  });
});

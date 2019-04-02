/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { OverviewHostStats } from '.';
import { mockData } from './mock';

describe('Overview Host Data', () => {
  describe('rendering', () => {
    test('it renders the default OverviewHostStats', () => {
      const wrapper = shallow(<OverviewHostStats data={mockData.OverviewHost} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});

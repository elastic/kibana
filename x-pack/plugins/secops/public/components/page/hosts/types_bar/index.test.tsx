/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TypesBar } from './index';
import { mockData } from './mock';

describe('TypeBar Component', () => {
  describe('rendering', () => {
    test('it renders the default TypesBar', () => {
      const wrapper = shallow(<TypesBar loading={false} data={mockData} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});

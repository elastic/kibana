/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { rawEventData } from '../../mock';

import { JsonView } from './json_view';

describe('JSON View', () => {
  describe('rendering', () => {
    test('should match snapshot', () => {
      const wrapper = shallow(<JsonView rawEventData={rawEventData} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});

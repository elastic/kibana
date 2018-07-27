/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SpaceIdentifier } from './space_identifier';
import { SpaceValidator } from '../lib';

test('renders without crashing', () => {
  const props = {
    space: {},
    editable: true,
    onChange: jest.fn(),
    validator: new SpaceValidator()
  };
  const wrapper = shallow(<SpaceIdentifier {...props} />);
  expect(wrapper).toMatchSnapshot();
});

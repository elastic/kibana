/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SpaceValidator } from '../lib';
import { SpaceIdentifier } from './space_identifier';

test('renders without crashing', () => {
  const props = {
    space: {
      id: '',
      name: '',
    },
    editable: true,
    onChange: jest.fn(),
    validator: new SpaceValidator(),
  };
  const wrapper = shallow(<SpaceIdentifier {...props} />);
  expect(wrapper).toMatchSnapshot();
});

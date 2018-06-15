/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { UrlContext } from './url_context';
import { SpaceValidator } from '../lib';

test('renders without crashing', () => {
  const props = {
    space: {},
    editable: true,
    editingExistingSpace: false,
    onChange: jest.fn(),
    validator: new SpaceValidator()
  };
  const wrapper = shallow(<UrlContext {...props} />);
  expect(wrapper).toMatchSnapshot();
});
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { CreateTransformButton } from './create_transform_button';

jest.mock('../../../../../shared_imports');

describe('Transform: Transform List <CreateTransformButton />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<CreateTransformButton onClick={jest.fn()} />);

    expect(wrapper).toMatchSnapshot();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TransformManagementSection } from './transform_management_section';

jest.mock('../../../shared_imports');

describe('Transform: <TransformManagementSection />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<TransformManagementSection />);

    expect(wrapper).toMatchSnapshot();
  });
});

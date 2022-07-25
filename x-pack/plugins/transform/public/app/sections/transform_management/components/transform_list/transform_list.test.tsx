/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TransformList } from './transform_list';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: Transform List <TransformList />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <TransformList
        onCreateTransform={jest.fn()}
        transformNodes={1}
        transforms={[]}
        transformsLoading={false}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});

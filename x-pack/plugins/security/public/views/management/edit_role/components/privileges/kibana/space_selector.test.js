/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SpaceSelector } from './space_selector';

describe('SpaceSelector', () => {
  it('renders without crashing', () => {
    expect(mount(<SpaceSelector spaces={[]} selectedSpaceIds={[]} onChange={jest.fn()} />)).toMatchSnapshot();
  });
});

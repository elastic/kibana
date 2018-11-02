/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { MemoryRouter } from 'react-router-dom';
import { ServiceList } from '../index';
import props from './props.json';
import {
  mountWithRouterAndStore,
  mockMoment,
  toJson
} from '../../../../../utils/testHelpers';

describe('ErrorGroupOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render empty state', () => {
    const storeState = {};
    const wrapper = mount(
      <MemoryRouter>
        <ServiceList items={[]} />
      </MemoryRouter>,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const storeState = { location: {} };
    const wrapper = mountWithRouterAndStore(
      <ServiceList items={props.items} />,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

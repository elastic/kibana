/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  mockMoment,
  mountWithRouterAndStore,
  toJson
  // @ts-ignore
} from '../../../../../utils/testHelpers';
// @ts-ignore
import { ErrorGroupList } from '../index';
import props from './props.json';

describe('ErrorGroupOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render empty state', () => {
    const storeState = {};
    const wrapper = mount(
      <MemoryRouter>
        <ErrorGroupList items={[]} urlParams={props.urlParams} location={{}} />
      </MemoryRouter>,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const storeState = { location: {} };
    const wrapper = mountWithRouterAndStore(
      <ErrorGroupList {...props} />,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

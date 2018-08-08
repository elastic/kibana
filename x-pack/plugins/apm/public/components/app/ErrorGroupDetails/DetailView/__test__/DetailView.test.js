/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import DetailView from '../index';
import props from './props.json';

import {
  mountWithRouterAndStore,
  mockMoment,
  toJson
} from '../../../../../utils/testHelpers';

describe('DetailView', () => {
  let storeState;
  beforeEach(() => {
    // Avoid timezone issues
    mockMoment();

    storeState = {
      location: { search: '' }
    };
  });

  it('should render empty state', () => {
    const wrapper = mountWithRouterAndStore(
      <DetailView errorGroup={[]} urlParams={props.urlParams} location={{}} />,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = mountWithRouterAndStore(
      <DetailView
        errorGroup={props.errorGroup}
        urlParams={props.urlParams}
        location={{}}
      />,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

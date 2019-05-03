/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { mockMoment, toJson } from '../../../../../utils/testHelpers';
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
        <ErrorGroupList
          items={[]}
          urlParams={props.urlParams}
          location={{} as Location}
        />
      </MemoryRouter>,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = mount(<ErrorGroupList {...props} />);

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

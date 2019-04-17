/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { Location } from 'history';
import createHistory from 'history/createHashHistory';
import PropTypes from 'prop-types';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
// @ts-ignore
import { createMockStore } from 'redux-test-utils';
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
    const storeState = { location: {} };
    const wrapper = mountWithRouterAndStore(
      <ErrorGroupList {...props} />,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

export function mountWithRouterAndStore(
  Component: React.ReactElement,
  storeState = {}
) {
  const store = createMockStore(storeState);
  const history = createHistory();

  const options = {
    context: {
      store,
      router: {
        history,
        route: {
          match: { path: '/', url: '/', params: {}, isExact: true },
          location: { pathname: '/', search: '', hash: '', key: '4yyjf5' }
        }
      }
    },
    childContextTypes: {
      store: PropTypes.object.isRequired,
      router: PropTypes.object.isRequired
    }
  };

  return mount(Component, options);
}

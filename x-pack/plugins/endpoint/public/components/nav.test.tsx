/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import { Nav } from './nav';
import { Router } from 'react-router-dom';
import { createBrowserHistory } from 'history';

describe('Nav', () => {
  test('it renders', () => {
    const history = createBrowserHistory();
    const pushMock = jest.fn();
    history.push = pushMock;

    const wrapper = mount(
      <Router history={history}>
        <Nav />
      </Router>
    );

    expect(toJson(wrapper)).toMatchSnapshot();

    const allNavItems = wrapper.find('.euiSideNavItem__items EuiSideNavItem');

    [
      { loc: '/', id: 'home' },
      { loc: '/management', id: 'management' },
      { loc: '/endpoints', id: 'endpoints' },
      { loc: '/alerts', id: 'alerts' },
    ].forEach(({ loc, id }, index) => {
      const menuItem = allNavItems
        .findWhere(navItem => navItem.key() === id)
        .find('button')
        .at(0);
      menuItem.simulate('click');
      expect(history.push).toHaveBeenCalledTimes(index + 1);
      expect(pushMock).toHaveBeenLastCalledWith(loc);
    });
  });
});

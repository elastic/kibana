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

    [
      { loc: '/', subj: 'navHomeItem' },
      { loc: '/management', subj: 'navManagementItem' },
      { loc: '/endpoints', subj: 'navEndpointsItem' },
      { loc: '/alerts', subj: 'navalertsItem' },
    ].forEach(({ loc, subj }, index) => {
      wrapper
        .find(`button[data-test-subj="${subj}"]`)
        .first()
        .simulate('click');
      expect(history.push).toHaveBeenCalledTimes(index + 1);
      expect(pushMock.mock.calls[index][0]).toEqual(loc);
    });
  });
});

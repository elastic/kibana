/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCallOut } from '@elastic/eui';
import { mount, shallow } from 'enzyme';
import React from 'react';
import { LoginState } from '../../../../../common/login_state';
import { BasicLoginForm } from './basic_login_form';

const createMockHttp = ({ simulateError = false } = {}) => {
  return {
    post: jest.fn(async () => {
      if (simulateError) {
        throw {
          data: {
            statusCode: 401,
          },
        };
      }

      return {
        statusCode: 200,
      };
    }),
  };
};

const createLoginState = (options?: Partial<LoginState>) => {
  return {
    allowLogin: true,
    layout: 'form',
    loginMessage: '',
    ...options,
  } as LoginState;
};

describe('BasicLoginForm', () => {
  it('renders as expected', () => {
    const mockHttp = createMockHttp();
    const mockWindow = {};
    const loginState = createLoginState();
    expect(
      shallow(
        <BasicLoginForm http={mockHttp} window={mockWindow} loginState={loginState} next={''} />
      )
    ).toMatchSnapshot();
  });

  it('renders an info message when provided', () => {
    const mockHttp = createMockHttp();
    const mockWindow = {};
    const loginState = createLoginState();

    const wrapper = shallow(
      <BasicLoginForm
        http={mockHttp}
        window={mockWindow}
        loginState={loginState}
        next={''}
        infoMessage={'Hey this is an info message'}
      />
    );

    expect(wrapper.find(EuiCallOut).props().title).toEqual('Hey this is an info message');
  });

  it('renders an invalid credentials message', async () => {
    const mockHttp = createMockHttp({ simulateError: true });
    const mockWindow = {};
    const loginState = createLoginState();

    const wrapper = mount(
      <BasicLoginForm http={mockHttp} window={mockWindow} loginState={loginState} next={''} />
    );

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password' } });
    wrapper.find(EuiButton).simulate('click');

    // Wait for ajax + rerender
    await Promise.resolve();
    wrapper.update();
    await Promise.resolve();
    wrapper.update();

    expect(wrapper.find(EuiCallOut).props().title).toEqual(
      `Invalid username or password. Please try again.`
    );
  });
});

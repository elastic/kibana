/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { mountWithIntl, nextTick, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { BasicLoginForm } from './basic_login_form';

import { coreMock } from '../../../../../../../../src/core/public/mocks';

describe('BasicLoginForm', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host/bar' },
      writable: true,
    });
  });

  afterAll(() => {
    delete (window as any).location;
  });

  it('renders as expected', () => {
    expect(
      shallowWithIntl(
        <BasicLoginForm http={coreMock.createStart().http} loginAssistanceMessage="" />
      )
    ).toMatchSnapshot();
  });

  it('renders an info message when provided.', () => {
    const wrapper = shallowWithIntl(
      <BasicLoginForm
        http={coreMock.createStart().http}
        infoMessage={'Hey this is an info message'}
        loginAssistanceMessage=""
      />
    );

    expect(wrapper.find(EuiCallOut).props().title).toEqual('Hey this is an info message');
  });

  it('renders an invalid credentials message', async () => {
    const mockHTTP = coreMock.createStart({ basePath: '/some-base-path' }).http;
    mockHTTP.post.mockRejectedValue({ response: { status: 401 } });

    const wrapper = mountWithIntl(<BasicLoginForm http={mockHTTP} loginAssistanceMessage="" />);

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiCallOut).props().title).toEqual(
      `Invalid username or password. Please try again.`
    );
  });

  it('renders unknown error message', async () => {
    const mockHTTP = coreMock.createStart({ basePath: '/some-base-path' }).http;
    mockHTTP.post.mockRejectedValue({ response: { status: 500 } });

    const wrapper = mountWithIntl(<BasicLoginForm http={mockHTTP} loginAssistanceMessage="" />);

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiCallOut).props().title).toEqual(`Oops! Error. Try again.`);
  });

  it('properly redirects after successful login', async () => {
    window.location.href = `https://some-host/login?next=${encodeURIComponent(
      '/some-base-path/app/kibana#/home?_g=()'
    )}`;
    const mockHTTP = coreMock.createStart({ basePath: '/some-base-path' }).http;
    mockHTTP.post.mockResolvedValue({});

    const wrapper = mountWithIntl(<BasicLoginForm http={mockHTTP} loginAssistanceMessage="" />);

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username1' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password1' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(mockHTTP.post).toHaveBeenCalledTimes(1);
    expect(mockHTTP.post).toHaveBeenCalledWith('/internal/security/login', {
      body: JSON.stringify({ username: 'username1', password: 'password1' }),
    });

    expect(window.location.href).toBe('/some-base-path/app/kibana#/home?_g=()');
    expect(wrapper.find(EuiCallOut).exists()).toBe(false);
  });
});

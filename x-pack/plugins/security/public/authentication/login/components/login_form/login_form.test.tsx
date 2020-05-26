/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { mountWithIntl, nextTick, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { LoginForm } from './login_form';

import { coreMock } from '../../../../../../../../src/core/public/mocks';

describe('LoginForm', () => {
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
    const coreStartMock = coreMock.createStart();
    expect(
      shallowWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          showLoginForm={true}
          selector={{ enabled: false, providers: [] }}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders an info message when provided.', () => {
    const coreStartMock = coreMock.createStart();
    const wrapper = shallowWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        infoMessage={'Hey this is an info message'}
        loginAssistanceMessage=""
        showLoginForm={true}
        selector={{ enabled: false, providers: [] }}
      />
    );

    expect(wrapper.find(EuiCallOut).props().title).toEqual('Hey this is an info message');
  });

  it('renders an invalid credentials message', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockRejectedValue({ response: { status: 401 } });

    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        showLoginForm={true}
        selector={{ enabled: false, providers: [] }}
      />
    );

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
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockRejectedValue({ response: { status: 500 } });

    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        showLoginForm={true}
        selector={{ enabled: false, providers: [] }}
      />
    );

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
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockResolvedValue({});

    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        showLoginForm={true}
        selector={{ enabled: false, providers: [] }}
      />
    );

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username1' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password1' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
      body: JSON.stringify({ username: 'username1', password: 'password1' }),
    });

    expect(window.location.href).toBe('/some-base-path/app/kibana#/home?_g=()');
    expect(wrapper.find(EuiCallOut).exists()).toBe(false);
  });

  describe('login selector', () => {
    it('renders as expected with login form', async () => {
      const coreStartMock = coreMock.createStart();
      expect(
        shallowWithIntl(
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            showLoginForm={true}
            selector={{
              enabled: true,
              providers: [
                { type: 'saml', name: 'saml1', description: 'Login w/SAML' },
                { type: 'pki', name: 'pki1', description: 'Login w/PKI' },
              ],
            }}
          />
        )
      ).toMatchSnapshot();
    });

    it('renders as expected without login form for providers with and without description', async () => {
      const coreStartMock = coreMock.createStart();
      expect(
        shallowWithIntl(
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            showLoginForm={false}
            selector={{
              enabled: true,
              providers: [
                { type: 'saml', name: 'saml1', description: 'Login w/SAML' },
                { type: 'pki', name: 'pki1' },
              ],
            }}
          />
        )
      ).toMatchSnapshot();
    });

    it('properly redirects after successful login', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockResolvedValue({
        location: 'https://external-idp/login?optional-arg=2#optional-hash',
      });

      window.location.href = currentURL;
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          showLoginForm={true}
          selector={{
            enabled: true,
            providers: [
              { type: 'saml', name: 'saml1', description: 'Login w/SAML' },
              { type: 'pki', name: 'pki1', description: 'Login w/PKI' },
            ],
          }}
        />
      );

      wrapper.findWhere((node) => node.key() === 'saml1').simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login_with', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe('https://external-idp/login?optional-arg=2#optional-hash');
      expect(wrapper.find(EuiCallOut).exists()).toBe(false);
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('shows error toast if login fails', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const failureReason = new Error('Oh no!');
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockRejectedValue(failureReason);

      window.location.href = currentURL;
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          showLoginForm={true}
          selector={{ enabled: true, providers: [{ type: 'saml', name: 'saml1' }] }}
        />
      );

      wrapper.findWhere((node) => node.key() === 'saml1').simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login_with', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
      expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
        title: 'Could not perform login.',
      });
    });
  });
});

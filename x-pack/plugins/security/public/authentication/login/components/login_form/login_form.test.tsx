/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiIcon } from '@elastic/eui';
import { act } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import ReactMarkdown from 'react-markdown';

import { findTestSubject, mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from 'src/core/public/mocks';

import { LoginForm, MessageType, PageMode } from './login_form';

function expectPageMode(wrapper: ReactWrapper, mode: PageMode) {
  const assertions: Array<[string, boolean]> =
    mode === PageMode.Form
      ? [
          ['loginForm', true],
          ['loginSelector', false],
          ['loginHelp', false],
          ['autoLoginOverlay', false],
        ]
      : mode === PageMode.Selector
      ? [
          ['loginForm', false],
          ['loginSelector', true],
          ['loginHelp', false],
          ['autoLoginOverlay', false],
        ]
      : [
          ['loginForm', false],
          ['loginSelector', false],
          ['loginHelp', true],
          ['autoLoginOverlay', false],
        ];
  for (const [selector, exists] of assertions) {
    expect(findTestSubject(wrapper, selector).exists()).toBe(exists);
  }
}

function expectAutoLoginOverlay(wrapper: ReactWrapper) {
  // Everything should be hidden except for the overlay
  for (const selector of [
    'loginForm',
    'loginSelector',
    'loginHelp',
    'loginHelpLink',
    'loginAssistanceMessage',
  ]) {
    expect(findTestSubject(wrapper, selector).exists()).toBe(false);
  }
  expect(findTestSubject(wrapper, 'autoLoginOverlay').exists()).toBe(true);
}

describe('LoginForm', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host/bar' },
      writable: true,
    });
  });

  it('renders as expected', () => {
    const coreStartMock = coreMock.createStart();
    expect(
      shallowWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          selector={{
            enabled: false,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
            ],
          }}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders an info message when provided.', () => {
    const coreStartMock = coreMock.createStart();
    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        message={{ type: MessageType.Info, content: 'Hey this is an info message' }}
        loginAssistanceMessage=""
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true }],
        }}
      />
    );

    expectPageMode(wrapper, PageMode.Form);

    expect(wrapper.find(EuiCallOut).props().title).toEqual('Hey this is an info message');
  });

  it('renders `Need help?` link if login help text is provided.', () => {
    const coreStartMock = coreMock.createStart();
    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginHelp={'**Hey this is a login help message**'}
        loginAssistanceMessage=""
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true }],
        }}
      />
    );

    expectPageMode(wrapper, PageMode.Form);

    expect(findTestSubject(wrapper, 'loginHelpLink').text()).toEqual('Need help?');
  });

  it('renders an invalid credentials message', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockRejectedValue({ response: { status: 401 } });

    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true }],
        }}
      />
    );

    expectPageMode(wrapper, PageMode.Form);

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiCallOut).props().title).toEqual(
      `Username or password is incorrect. Please try again.`
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
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true }],
        }}
      />
    );

    expectPageMode(wrapper, PageMode.Form);

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiCallOut).props().title).toEqual(
      `We couldn't log you in. Please try again.`
    );
  });

  it('properly redirects after successful login', async () => {
    window.location.href = `https://some-host/login?next=${encodeURIComponent(
      '/some-base-path/app/home#/?_g=()'
    )}`;
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockResolvedValue({ location: '/some-base-path/app/home#/?_g=()' });

    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true }],
        }}
      />
    );

    expectPageMode(wrapper, PageMode.Form);

    wrapper.find('input[name="username"]').simulate('change', { target: { value: 'username1' } });
    wrapper.find('input[name="password"]').simulate('change', { target: { value: 'password1' } });
    wrapper.find(EuiButton).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
      body: JSON.stringify({
        providerType: 'basic',
        providerName: 'basic1',
        currentURL: `https://some-host/login?next=${encodeURIComponent(
          '/some-base-path/app/home#/?_g=()'
        )}`,
        params: { username: 'username1', password: 'password1' },
      }),
    });

    expect(window.location.href).toBe('/some-base-path/app/home#/?_g=()');
    expect(wrapper.find(EuiCallOut).exists()).toBe(false);
  });

  it('properly switches to login help', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        loginHelp="**some help**"
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true }],
        }}
      />
    );

    expectPageMode(wrapper, PageMode.Form);
    expect(findTestSubject(wrapper, 'loginBackToSelector').exists()).toBe(false);

    // Going to login help.
    findTestSubject(wrapper, 'loginHelpLink').simulate('click');
    wrapper.update();
    expectPageMode(wrapper, PageMode.LoginHelp);

    expect(findTestSubject(wrapper, 'loginHelp').find(ReactMarkdown)).toMatchSnapshot('Login Help');

    // Going back to login form.
    findTestSubject(wrapper, 'loginBackToLoginLink').simulate('click');
    wrapper.update();
    expectPageMode(wrapper, PageMode.Form);
    expect(findTestSubject(wrapper, 'loginBackToSelector').exists()).toBe(false);
  });

  describe('login selector', () => {
    it('renders as expected with providers that use login form', async () => {
      const coreStartMock = coreMock.createStart();
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          selector={{
            enabled: true,
            providers: [
              {
                type: 'basic',
                name: 'basic',
                usesLoginForm: true,
                hint: 'Basic hint',
                icon: 'logoElastic',
                showInSelector: true,
              },
              {
                type: 'saml',
                name: 'saml1',
                description: 'Log in w/SAML',
                usesLoginForm: false,
                showInSelector: true,
              },
              {
                type: 'pki',
                name: 'pki1',
                description: 'Log in w/PKI',
                hint: 'PKI hint',
                usesLoginForm: false,
                showInSelector: true,
              },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      expect(
        wrapper.find('.secLoginCard').map((card) => {
          const hint = card.find('.secLoginCard__hint');
          return {
            title: card.find('p.secLoginCard__title').text(),
            hint: hint.exists() ? hint.text() : '',
            icon: card.find(EuiIcon).props().type,
          };
        })
      ).toEqual([
        { title: 'Log in with basic/basic', hint: 'Basic hint', icon: 'logoElastic' },
        { title: 'Log in w/SAML', hint: '', icon: 'empty' },
        { title: 'Log in w/PKI', hint: 'PKI hint', icon: 'empty' },
      ]);
    });

    it('renders as expected without providers that use login form', async () => {
      const coreStartMock = coreMock.createStart();
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          selector={{
            enabled: true,
            providers: [
              {
                type: 'saml',
                name: 'saml1',
                description: 'Login w/SAML',
                hint: 'SAML hint',
                usesLoginForm: false,
                showInSelector: true,
              },
              {
                type: 'pki',
                name: 'pki1',
                icon: 'some-icon',
                usesLoginForm: false,
                showInSelector: true,
              },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      expect(
        wrapper.find('.secLoginCard').map((card) => {
          const hint = card.find('.secLoginCard__hint');
          return {
            title: card.find('p.secLoginCard__title').text(),
            hint: hint.exists() ? hint.text() : '',
            icon: card.find(EuiIcon).props().type,
          };
        })
      ).toEqual([
        { title: 'Login w/SAML', hint: 'SAML hint', icon: 'empty' },
        { title: 'Log in with pki/pki1', hint: '', icon: 'some-icon' },
      ]);
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
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              {
                type: 'saml',
                name: 'saml1',
                description: 'Login w/SAML',
                usesLoginForm: false,
                showInSelector: true,
              },
              {
                type: 'pki',
                name: 'pki1',
                description: 'Login w/PKI',
                usesLoginForm: false,
                showInSelector: true,
              },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      wrapper.findWhere((node) => node.key() === 'saml1').simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
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
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      wrapper.findWhere((node) => node.key() === 'saml1').simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
      expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
        title: 'Could not perform login.',
        toastMessage: 'Oh no!',
      });
    });

    it('shows error with message in the `body`', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockRejectedValue({
        body: { message: 'Oh no! But with much more details!' },
        message: 'Oh no!',
      });

      window.location.href = currentURL;
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      wrapper.findWhere((node) => node.key() === 'saml1').simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
      expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('Oh no! But with much more details!'),
        { title: 'Could not perform login.', toastMessage: 'Oh no!' }
      );
    });

    it('properly switches to login form', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      window.location.href = currentURL;
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      wrapper.findWhere((node) => node.key() === 'basic').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.Form);

      expect(coreStartMock.http.post).not.toHaveBeenCalled();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
      expect(window.location.href).toBe(currentURL);
    });

    it('properly switches to login help', async () => {
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          loginHelp="**some help**"
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      findTestSubject(wrapper, 'loginHelpLink').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.LoginHelp);

      expect(findTestSubject(wrapper, 'loginHelp').find(ReactMarkdown)).toMatchSnapshot(
        'Login Help'
      );

      // Going back to login selector.
      findTestSubject(wrapper, 'loginBackToLoginLink').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.Selector);

      expect(coreStartMock.http.post).not.toHaveBeenCalled();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('properly switches to login form -> login help and back', async () => {
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginAssistanceMessage=""
          loginHelp="**some help**"
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Selector);

      // Going to login form.
      wrapper.findWhere((node) => node.key() === 'basic').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.Form);

      // Going to login help.
      findTestSubject(wrapper, 'loginHelpLink').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.LoginHelp);

      expect(findTestSubject(wrapper, 'loginHelp').find(ReactMarkdown)).toMatchSnapshot(
        'Login Help'
      );

      // Going back to login form.
      findTestSubject(wrapper, 'loginBackToLoginLink').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.Form);

      // Going back to login selector.
      findTestSubject(wrapper, 'loginBackToSelector').simulate('click');
      wrapper.update();
      expectPageMode(wrapper, PageMode.Selector);

      expect(coreStartMock.http.post).not.toHaveBeenCalled();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });
  });

  describe('auto login', () => {
    it('automatically switches to the Login Form mode if provider suggested by the auth provider hint needs it', () => {
      const coreStartMock = coreMock.createStart();
      const wrapper = mountWithIntl(
        <LoginForm
          http={coreStartMock.http}
          notifications={coreStartMock.notifications}
          loginHelp={'**Hey this is a login help message**'}
          loginAssistanceMessage="Need assistance?"
          authProviderHint="basic1"
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectPageMode(wrapper, PageMode.Form);
      expect(findTestSubject(wrapper, 'loginHelpLink').text()).toEqual('Need help?');
      expect(findTestSubject(wrapper, 'loginAssistanceMessage').text()).toEqual('Need assistance?');
    });

    it('automatically logs in if provider suggested by the auth provider hint is displayed in the selector', async () => {
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
          loginHelp={'**Hey this is a login help message**'}
          loginAssistanceMessage="Need assistance?"
          authProviderHint="saml1"
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectAutoLoginOverlay(wrapper);

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe('https://external-idp/login?optional-arg=2#optional-hash');
      expect(wrapper.find(EuiCallOut).exists()).toBe(false);
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('automatically logs in if provider suggested by the auth provider hint is not displayed in the selector', async () => {
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
          loginHelp={'**Hey this is a login help message**'}
          loginAssistanceMessage="Need assistance?"
          authProviderHint="saml1"
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: false },
            ],
          }}
        />
      );

      expectAutoLoginOverlay(wrapper);

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe('https://external-idp/login?optional-arg=2#optional-hash');
      expect(wrapper.find(EuiCallOut).exists()).toBe(false);
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('switches to the login selector if could not login with provider suggested by the auth provider hint', async () => {
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
          loginHelp={'**Hey this is a login help message**'}
          loginAssistanceMessage="Need assistance?"
          authProviderHint="saml1"
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
            ],
          }}
        />
      );

      expectAutoLoginOverlay(wrapper);

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
      expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
        title: 'Could not perform login.',
        toastMessage: 'Oh no!',
      });

      expectPageMode(wrapper, PageMode.Selector);
      expect(findTestSubject(wrapper, 'loginHelpLink').text()).toEqual('Need help?');
      expect(findTestSubject(wrapper, 'loginAssistanceMessage').text()).toEqual('Need assistance?');
    });
  });
});

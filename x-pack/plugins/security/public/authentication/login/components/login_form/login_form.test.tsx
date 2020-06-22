/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { act } from '@testing-library/react';
import { EuiButton, EuiCallOut, EuiIcon } from '@elastic/eui';
import { mountWithIntl, nextTick, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';
import { LoginForm, PageMode } from './login_form';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';

function expectPageMode(wrapper: ReactWrapper, mode: PageMode) {
  const assertions: Array<[string, boolean]> =
    mode === PageMode.Form
      ? [
          ['loginForm', true],
          ['loginSelector', false],
          ['loginHelp', false],
        ]
      : mode === PageMode.Selector
      ? [
          ['loginForm', false],
          ['loginSelector', true],
          ['loginHelp', false],
        ]
      : [
          ['loginForm', false],
          ['loginSelector', false],
          ['loginHelp', true],
        ];
  for (const [selector, exists] of assertions) {
    expect(findTestSubject(wrapper, selector).exists()).toBe(exists);
  }
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
            providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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
        infoMessage={'Hey this is an info message'}
        loginAssistanceMessage=""
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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

    expect(wrapper.find(EuiCallOut).props().title).toEqual(`Oops! Error. Try again.`);
  });

  it('properly redirects after successful login', async () => {
    window.location.href = `https://some-host/login?next=${encodeURIComponent(
      '/some-base-path/app/home#/?_g=()'
    )}`;
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockResolvedValue({});

    const wrapper = mountWithIntl(
      <LoginForm
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        loginAssistanceMessage=""
        selector={{
          enabled: false,
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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
      body: JSON.stringify({ username: 'username1', password: 'password1' }),
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
          providers: [{ type: 'basic', name: 'basic', usesLoginForm: true }],
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
              },
              { type: 'saml', name: 'saml1', description: 'Log in w/SAML', usesLoginForm: false },
              {
                type: 'pki',
                name: 'pki1',
                description: 'Log in w/PKI',
                hint: 'PKI hint',
                usesLoginForm: false,
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
              },
              { type: 'pki', name: 'pki1', icon: 'some-icon', usesLoginForm: false },
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
              { type: 'basic', name: 'basic', usesLoginForm: true },
              { type: 'saml', name: 'saml1', description: 'Login w/SAML', usesLoginForm: false },
              { type: 'pki', name: 'pki1', description: 'Login w/PKI', usesLoginForm: false },
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
          selector={{
            enabled: true,
            providers: [
              { type: 'basic', name: 'basic', usesLoginForm: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false },
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
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login_with', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
      expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
        title: 'Could not perform login.',
      });
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
              { type: 'basic', name: 'basic', usesLoginForm: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false },
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
              { type: 'basic', name: 'basic', usesLoginForm: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false },
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
              { type: 'basic', name: 'basic', usesLoginForm: true },
              { type: 'saml', name: 'saml1', usesLoginForm: false },
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
});

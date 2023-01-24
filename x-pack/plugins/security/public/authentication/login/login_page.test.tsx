/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { act } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER } from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';
import { DisabledLoginForm, LoginForm, LoginFormMessageType } from './components';
import { LoginPage } from './login_page';

const createLoginState = (options?: Partial<LoginState>) => {
  return {
    allowLogin: true,
    layout: 'form',
    requiresSecureConnection: false,
    selector: {
      enabled: false,
      providers: [{ type: 'basic', name: 'basic1', usesLoginForm: true }],
    },
    ...options,
  } as LoginState;
};

describe('LoginPage', () => {
  // mock a minimal subset of the HttpSetup
  const httpMock = {
    get: jest.fn(),
    addLoadingCountSource: jest.fn(),
  } as any;
  const resetHttpMock = () => {
    httpMock.get.mockReset();
    httpMock.addLoadingCountSource.mockReset();
  };

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://some-host/bar', protocol: 'http' },
      writable: true,
    });

    resetHttpMock();
  });

  describe('page', () => {
    it('renders as expected', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('disabled form states', () => {
    const originalNavigator = window.navigator;
    const originalTop = window.top;

    afterEach(function () {
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
      Object.defineProperty(window, 'top', {
        value: originalTop,
        writable: true,
      });
    });

    it('renders as expected when secure connection is required but not present', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ requiresSecureConnection: true }));

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(DisabledLoginForm)).toMatchSnapshot();
    });

    it('renders as expected when a connection to ES is not available', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ layout: 'error-es-unavailable' }));

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(DisabledLoginForm)).toMatchSnapshot();
    });

    it('renders as expected when xpack is not available', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ layout: 'error-xpack-unavailable' }));

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(DisabledLoginForm)).toMatchSnapshot();
    });

    it('renders as expected when an unknown loginState layout is provided', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(
        createLoginState({ layout: 'error-asdf-asdf-unknown' as any })
      );

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(DisabledLoginForm)).toMatchSnapshot();
    });

    it('renders as expected when login is not enabled', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(
        createLoginState({ selector: { enabled: false, providers: [] } })
      );

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(DisabledLoginForm)).toMatchSnapshot();
    });

    it('renders CTA and cross-origin cookie warning when cookies are disabled, document is embedded inside iframe, and cross-origin cookies are blocked', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      Object.defineProperty(window, 'navigator', {
        value: { cookieEnabled: false },
        writable: true,
      });
      Object.defineProperty(window, 'top', {
        value: {},
        writable: true,
      });

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          sameSiteCookies="Lax"
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(EuiFlexItem).children()).toMatchSnapshot();
    });

    it('renders CTA and browser settings warning when cookies are disabled, document is embedded inside iframe, and cross-origin cookies are allowed', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      Object.defineProperty(window, 'navigator', {
        value: { cookieEnabled: false },
        writable: true,
      });
      Object.defineProperty(window, 'top', {
        value: {},
        writable: true,
      });

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          sameSiteCookies="None"
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(EuiFlexItem).children()).toMatchSnapshot();
    });

    it('renders warning when cookies are disabled and document is not embedded inside iframe', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      Object.defineProperty(window, 'navigator', {
        value: { cookieEnabled: false },
        writable: true,
      });

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(DisabledLoginForm)).toMatchSnapshot();
    });
  });

  describe('enabled form state', () => {
    it('renders as expected', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper.find(LoginForm)).toMatchSnapshot();
    });

    it('properly passes query string parameters to the form', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());
      window.location.href = `http://some-host/bar?msg=SESSION_EXPIRED&${AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER}=basic1`;

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      const { authProviderHint, message } = wrapper.find(LoginForm).props();
      expect(authProviderHint).toBe('basic1');
      expect(message).toEqual({
        type: LoginFormMessageType.Info,
        content: 'Your session has timed out. Please log in again.',
      });
    });

    it('renders as expected when loginAssistanceMessage is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage="This is an *important* message"
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper.find(LoginForm)).toMatchSnapshot();
    });

    it('renders as expected when loginHelp is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ loginHelp: '**some-help**' }));

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper.find(LoginForm)).toMatchSnapshot();
    });
  });

  describe('API calls', () => {
    it('GET login_state success', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(httpMock.addLoadingCountSource).toHaveBeenCalledTimes(1);
      expect(httpMock.get).toHaveBeenCalledTimes(1);
      expect(httpMock.get).toHaveBeenCalledWith('/internal/security/login_state');
      expect(coreStartMock.fatalErrors.add).not.toHaveBeenCalled();
    });

    it('GET login_state failure', async () => {
      const coreStartMock = coreMock.createStart();
      const error = Symbol();
      httpMock.get.mockRejectedValue(error);

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(httpMock.addLoadingCountSource).toHaveBeenCalledTimes(1);
      expect(httpMock.get).toHaveBeenCalledTimes(1);
      expect(httpMock.get).toHaveBeenCalledWith('/internal/security/login_state');
      expect(coreStartMock.fatalErrors.add).toHaveBeenCalledTimes(1);
      expect(coreStartMock.fatalErrors.add).toHaveBeenCalledWith(error);
    });
  });
});

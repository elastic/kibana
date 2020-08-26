/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { act } from '@testing-library/react';
import { nextTick } from 'test_utils/enzyme_helpers';
import { LoginState } from '../../../common/login_state';
import { LoginPage } from './login_page';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { DisabledLoginForm, LoginForm } from './components';

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

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://some-host/bar', protocol: 'http' },
      writable: true,
    });
  });

  beforeEach(() => {
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

    it('renders as expected when info message is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());
      window.location.href = 'http://some-host/bar?msg=SESSION_EXPIRED';

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

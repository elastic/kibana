/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { act } from '@testing-library/react';
import { nextTick } from 'test_utils/enzyme_helpers';
import { LoginState } from './login_state';
import { LoginPage } from './login_page';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { DisabledLoginForm, BasicLoginForm } from './components';

const createLoginState = (options?: Partial<LoginState>) => {
  return {
    allowLogin: true,
    layout: 'form',
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

  afterAll(() => {
    delete (window as any).location;
  });

  describe('page', () => {
    it('renders as expected', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
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
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={true}
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
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
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
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
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
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
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
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper.find(BasicLoginForm)).toMatchSnapshot();
    });

    it('renders as expected when info message is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());
      window.location.href = 'http://some-host/bar?msg=SESSION_EXPIRED';

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper.find(BasicLoginForm)).toMatchSnapshot();
    });

    it('renders as expected when loginAssistanceMessage is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage="This is an *important* message"
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
        resetHttpMock(); // so the calls don't show in the BasicLoginForm snapshot
      });

      expect(wrapper.find(BasicLoginForm)).toMatchSnapshot();
    });
  });

  describe('API calls', () => {
    it('GET login_state success', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={httpMock}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
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
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
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

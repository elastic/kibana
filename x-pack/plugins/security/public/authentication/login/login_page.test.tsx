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

const createLoginState = (options?: Partial<LoginState>) => {
  return {
    allowLogin: true,
    layout: 'form',
    ...options,
  } as LoginState;
};

describe('LoginPage', () => {
  describe('disabled form states', () => {
    it('renders as expected when secure cookies are required but not present', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={true}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(coreStartMock.http.get).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.get).toHaveBeenCalledWith('/internal/security/login_state');

      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when a connection to ES is not available', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(
        createLoginState({ layout: 'error-es-unavailable' })
      );

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when xpack is not available', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(
        createLoginState({ layout: 'error-xpack-unavailable' })
      );

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when an unknown loginState layout is provided', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(
        createLoginState({ layout: 'error-asdf-asdf-unknown' as any })
      );

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when loginAssistanceMessage is set', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage="This is an *important* message"
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('enabled form state', () => {
    beforeAll(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://some-host/bar', protocol: 'http' },
        writable: true,
      });
    });

    afterAll(() => {
      delete (window as any).location;
    });

    it('renders as expected', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(createLoginState());

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when info message is set', async () => {
      const coreStartMock = coreMock.createStart();
      coreStartMock.http.get.mockResolvedValue(createLoginState());
      window.location.href = 'http://some-host/bar?msg=SESSION_EXPIRED';

      const wrapper = shallow(
        <LoginPage
          http={coreStartMock.http}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          requiresSecureConnection={false}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper).toMatchSnapshot();
    });
  });
});

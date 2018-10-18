/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { LoginLayout, LoginState } from '../../../../../common/login_state';
import { LoginPage } from './login_page';

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

describe('LoginPage', () => {
  describe('disabled form states', () => {
    it('renders as expected when secure cookies are required but not present', () => {
      const props = {
        http: createMockHttp(),
        window: {},
        next: '',
        loginState: createLoginState(),
        isSecureConnection: false,
        requiresSecureConnection: true,
      };

      expect(shallow(<LoginPage {...props} />)).toMatchSnapshot();
    });

    it('renders as expected when a connection to ES is not available', () => {
      const props = {
        http: createMockHttp(),
        window: {},
        next: '',
        loginState: createLoginState({
          layout: 'error-es-unavailable',
        }),
        isSecureConnection: false,
        requiresSecureConnection: false,
      };

      expect(shallow(<LoginPage {...props} />)).toMatchSnapshot();
    });

    it('renders as expected when xpack is not available', () => {
      const props = {
        http: createMockHttp(),
        window: {},
        next: '',
        loginState: createLoginState({
          layout: 'error-xpack-unavailable',
        }),
        isSecureConnection: false,
        requiresSecureConnection: false,
      };

      expect(shallow(<LoginPage {...props} />)).toMatchSnapshot();
    });

    it('renders as expected when an unknown loginState layout is provided', () => {
      const props = {
        http: createMockHttp(),
        window: {},
        next: '',
        loginState: createLoginState({
          layout: 'error-asdf-asdf-unknown' as LoginLayout,
        }),
        isSecureConnection: false,
        requiresSecureConnection: false,
      };

      expect(shallow(<LoginPage {...props} />)).toMatchSnapshot();
    });
  });

  describe('enabled form state', () => {
    it('renders as expected', () => {
      const props = {
        http: createMockHttp(),
        window: {},
        next: '',
        loginState: createLoginState(),
        isSecureConnection: false,
        requiresSecureConnection: false,
      };

      expect(shallow(<LoginPage {...props} />)).toMatchSnapshot();
    });
  });
});

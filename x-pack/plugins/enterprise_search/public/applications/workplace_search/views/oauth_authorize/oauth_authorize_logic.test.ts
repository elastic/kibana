/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { OAuthAuthorizeLogic, transformServerPreAuth } from './oauth_authorize_logic';

describe('OAuthAuthorizeLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(OAuthAuthorizeLogic);
  const defaultValues = {
    dataLoading: true,
    buttonLoading: false,
    cachedPreAuth: {},
    hasError: false,
  };
  const serverResponse = {
    client_id: 'id1',
    client_name: 'client1',
    redirect_uri: 'htt://foo.bar',
    response_type: 'JSON',
    scope: 'scope1',
    state: 'state1',
    status: 'success',
  };
  const entSearchState = 'entSearchStateString';
  const entSearchStateParam = `state=${entSearchState}`;
  const searchOAuth = {
    clientId: 'someUID',
    redirectUrl: 'http://localhost:3002/ws/search_callback',
  };
  const successRedirectResponse = {
    redirect_uri: `${searchOAuth.redirectUrl}?code=authCode&${entSearchStateParam}`,
    status: 'redirect',
  };

  const parsedQueryParams = {
    state: 'entSearchStateString',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(OAuthAuthorizeLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setServerProps', () => {
      OAuthAuthorizeLogic.actions.setServerProps(serverResponse);

      expect(OAuthAuthorizeLogic.values).toEqual({
        ...defaultValues,
        dataLoading: false,
        cachedPreAuth: {
          ...transformServerPreAuth(serverResponse),
        },
      });
    });

    it('setButtonNotLoading', () => {
      // Set loading state to true for test.
      OAuthAuthorizeLogic.actions.allowOAuthAuthorization();
      OAuthAuthorizeLogic.actions.setButtonNotLoading();

      expect(OAuthAuthorizeLogic.values).toEqual({
        ...defaultValues,
        buttonLoading: false,
      });
    });

    it('allowOAuthAuthorization', () => {
      OAuthAuthorizeLogic.actions.allowOAuthAuthorization();

      expect(OAuthAuthorizeLogic.values).toEqual({
        ...defaultValues,
        buttonLoading: true,
      });
    });

    it('denyOAuthAuthorization', () => {
      OAuthAuthorizeLogic.actions.denyOAuthAuthorization();

      expect(OAuthAuthorizeLogic.values).toEqual({
        ...defaultValues,
        buttonLoading: true,
      });
    });
  });

  describe('listeners', () => {
    describe('initializeOAuthPreAuth', () => {
      // Mocking window.location.replace(redirectUrl) for redirects
      const mockLocationReplace = jest.fn();
      const mockLocation = {
        value: {
          replace: mockLocationReplace,
        },
        writable: true,
      };
      Object.defineProperty(window, 'location', mockLocation);

      it('gets pre-authorization and sets values', async () => {
        const setServerPropsSpy = jest.spyOn(OAuthAuthorizeLogic.actions, 'setServerProps');
        http.get.mockReturnValue(Promise.resolve(serverResponse));
        OAuthAuthorizeLogic.actions.initializeOAuthPreAuth(entSearchStateParam);

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/oauth/authorize', {
          query: parsedQueryParams,
        });
        await nextTick();
        expect(setServerPropsSpy).toHaveBeenCalledWith(serverResponse);
      });

      it('redirects when already authorized', async () => {
        http.get.mockReturnValue(Promise.resolve(successRedirectResponse));
        OAuthAuthorizeLogic.actions.initializeOAuthPreAuth(entSearchStateParam);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/oauth/authorize', {
          query: parsedQueryParams,
        });
        await nextTick();
        expect(mockLocationReplace).toHaveBeenCalledWith(successRedirectResponse.redirect_uri);
      });

      it('handles error', async () => {
        const setHasErrorSpy = jest.spyOn(OAuthAuthorizeLogic.actions, 'setHasError');
        http.get.mockReturnValue(Promise.reject('this is an error'));

        OAuthAuthorizeLogic.actions.initializeOAuthPreAuth(entSearchStateParam);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/oauth/authorize', {
          query: parsedQueryParams,
        });
        await nextTick();

        expect(setHasErrorSpy).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });
  });
});

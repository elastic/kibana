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

import { SearchAuthorizeLogic } from './search_authorize_logic';

describe('SearchAuthorizeLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(SearchAuthorizeLogic);
  const defaultValues = {
    redirectPending: true,
    cachedPreAuth: {},
  };
  const entSearchState = 'entSearchStateString';
  const entSearchStateParam = `state=${entSearchState}`;
  const searchOAuth = {
    clientId: 'someUID',
    redirectUrl: 'http://localhost:3002/ws/search_callback',
  };
  const preAuthQuery = {
    client_id: searchOAuth.clientId,
    response_type: 'code',
    redirect_uri: searchOAuth.redirectUrl,
    scope: 'default_search',
    state: entSearchState,
  };
  const preAuthServerProps = {
    ...preAuthQuery,
    client_name: 'Workplace Search',
    status: 'Pre-Authorization',
  };
  const successRedirectResponse = {
    redirect_uri: `${searchOAuth.redirectUrl}?code=authCode&${entSearchStateParam}`,
    status: 'redirect',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SearchAuthorizeLogic.values).toEqual(defaultValues);
  });

  describe('listeners', () => {
    describe('initializeSearchAuth', () => {
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
        const setServerPropsSpy = jest.spyOn(SearchAuthorizeLogic.actions, 'setServerProps');
        http.get.mockReturnValue(Promise.resolve(preAuthServerProps));
        SearchAuthorizeLogic.actions.initializeSearchAuth(searchOAuth, entSearchStateParam);

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/oauth/authorize', {
          query: preAuthQuery,
        });
        await nextTick();
        expect(setServerPropsSpy).toHaveBeenCalledWith(preAuthServerProps);
      });

      it('redirects when already authorized', async () => {
        http.get.mockReturnValue(Promise.resolve(successRedirectResponse));
        SearchAuthorizeLogic.actions.initializeSearchAuth(searchOAuth, entSearchStateParam);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/oauth/authorize', {
          query: preAuthQuery,
        });
        await nextTick();
        expect(mockLocationReplace).toHaveBeenCalledWith(successRedirectResponse.redirect_uri);
      });

      it('handles error', async () => {
        const setRedirectNotPendingSpy = jest.spyOn(
          SearchAuthorizeLogic.actions,
          'setRedirectNotPending'
        );
        http.get.mockReturnValue(Promise.reject('this is an error'));

        SearchAuthorizeLogic.actions.initializeSearchAuth(searchOAuth, entSearchStateParam);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/oauth/authorize', {
          query: preAuthQuery,
        });
        await nextTick();

        expect(setRedirectNotPendingSpy).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });
  });
});

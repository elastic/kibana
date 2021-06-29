/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';
import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { Loading } from '../../../shared/loading';

import { OAuthAuthorize } from './oauth_authorize';

describe('OAuthAuthorize', () => {
  const mockActions = {
    initializeSearchAuth: jest.fn(),
    initializeOAuthPreAuth: jest.fn(),
    allowOAuthAuthorization: jest.fn(),
    denyOAuthAuthorization: jest.fn(),
  };

  const mockValues = {
    dataLoading: true,
    buttonLoading: false,
    cachedPreAuth: {},
    hasError: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('renders loading and calls initializeSearchAuth', () => {
    const search = '?state=someRandomString';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<OAuthAuthorize />);

    expect(wrapper.find(Loading)).toHaveLength(1);
    expect(mockActions.initializeOAuthPreAuth).toHaveBeenCalled();
  });

  it('renders httpRedirectUriWarning', () => {
    setMockValues({
      ...mockValues,
      dataLoading: false,
      cachedPreAuth: {
        redirectUri: 'http://foo',
      },
    });
    const wrapper = shallow(<OAuthAuthorize />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(2);
  });

  describe('scopeDescription', () => {
    it('renders "search" scope description', () => {
      setMockValues({
        ...mockValues,
        dataLoading: false,
        cachedPreAuth: {
          scopes: ['search'],
        },
      });

      const wrapper = shallow(<OAuthAuthorize />);

      expect(wrapper.find('[data-test-subj="ScopeDescription"]').text()).toContain(
        'Search your data'
      );
    });

    it('renders "write" scope description', () => {
      setMockValues({
        ...mockValues,
        dataLoading: false,
        cachedPreAuth: {
          scopes: ['write'],
        },
      });

      const wrapper = shallow(<OAuthAuthorize />);

      expect(wrapper.find('[data-test-subj="ScopeDescription"]').text()).toContain(
        'Modify your data'
      );
    });

    it('renders "unknown" scope description', () => {
      setMockValues({
        ...mockValues,
        dataLoading: false,
        cachedPreAuth: {
          scopes: ['other'],
        },
      });

      const wrapper = shallow(<OAuthAuthorize />);

      expect(wrapper.find('[data-test-subj="ScopeDescription"]').text()).toContain(
        '<FormattedMessage />'
      );
    });
  });
});

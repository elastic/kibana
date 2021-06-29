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

import { FlashMessages } from '../../../shared/flash_messages';
import { Loading } from '../../../shared/loading';

import { SearchAuthorize } from './search_authorize';

describe('SearchAuthorize', () => {
  const initializeSearchAuth = jest.fn();

  const mockValues = {
    redirectPending: true,
    searchOAuth: {
      clientId: 'someUID',
      redirectUrl: 'http://localhost:3002/ws/search_callback',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions({ initializeSearchAuth });
  });

  it('renders loading and calls initializeSearchAuth', () => {
    setMockValues(mockValues);
    const search = '?state=someRandomString';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<SearchAuthorize />);

    expect(wrapper.find(Loading)).toHaveLength(1);
    expect(initializeSearchAuth).toHaveBeenCalled();
  });

  it('does not call initializeSearchAuth when searchOAuth.clientId is null', () => {
    setMockValues({ ...mockValues, searchOAuth: {} });
    const wrapper = shallow(<SearchAuthorize />);

    expect(wrapper.find(Loading)).toHaveLength(1);
    expect(initializeSearchAuth).not.toHaveBeenCalled();
  });

  it('renders flash messages', () => {
    setMockValues({ ...mockValues, redirectPending: false });
    const search = '?state=someRandomString';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<SearchAuthorize />);

    expect(wrapper.find(FlashMessages)).toHaveLength(1);
  });
});

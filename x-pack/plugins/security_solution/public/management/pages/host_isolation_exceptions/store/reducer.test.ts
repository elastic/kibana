/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserChangedUrl } from '../../../../common/store/routing/action';
import { HostIsolationExceptionsPageState } from '../types';
import { initialHostIsolationExceptionsPageState } from './builders';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { hostIsolationExceptionsPageReducer } from './reducer';
import { getCurrentLocation } from './selector';

describe('Host isolation exceptions Reducer', () => {
  let initialState: HostIsolationExceptionsPageState;

  beforeEach(() => {
    initialState = initialHostIsolationExceptionsPageState();
  });

  describe('UserChangedUrl', () => {
    const userChangedUrlAction = (
      search = '',
      pathname = HOST_ISOLATION_EXCEPTIONS_PATH
    ): UserChangedUrl => ({
      type: 'userChangedUrl',
      payload: { search, pathname, hash: '' },
    });

    describe('When the url is set to host isolation exceptions', () => {
      it('should set the default page size and index', () => {
        const result = hostIsolationExceptionsPageReducer(initialState, userChangedUrlAction());
        expect(getCurrentLocation(result)).toEqual({
          filter: '',
          id: undefined,
          included_policies: '',
          page_index: 0,
          page_size: 10,
          show: undefined,
        });
      });
    });
  });
});

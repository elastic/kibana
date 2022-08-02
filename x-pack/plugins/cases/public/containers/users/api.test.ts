/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GENERAL_CASES_OWNER } from '../../../common/constants';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { suggestUserProfiles } from './api';
import { userProfiles } from './api.mock';

describe('User profiles API', () => {
  describe('suggestUserProfiles', () => {
    const abortCtrl = new AbortController();
    const { http } = createStartServicesMock();

    beforeEach(() => {
      jest.clearAllMocks();
      http.post = jest.fn().mockResolvedValue(userProfiles);
    });

    it('returns the user profiles correctly', async () => {
      const res = await suggestUserProfiles({
        http,
        name: 'elastic',
        owner: [GENERAL_CASES_OWNER],
        signal: abortCtrl.signal,
      });

      expect(res).toEqual(userProfiles);
    });

    it('calls http.post correctly', async () => {
      await suggestUserProfiles({
        http,
        name: 'elastic',
        owner: [GENERAL_CASES_OWNER],
        signal: abortCtrl.signal,
      });

      expect(http.post).toHaveBeenCalledWith('/internal/cases/_suggest_user_profiles', {
        body: '{"name":"elastic","size":100,"owner":["cases"]}',
        signal: abortCtrl.signal,
      });
    });
  });
});

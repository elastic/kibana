/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserNameFromInfluencers } from './get_user_name_from_influencers';
import { mockAnomalies } from '../mock';

describe('get_user_name_from_influencers', () => {
  test('returns user names from influencers from the mock', () => {
    expect(getUserNameFromInfluencers(mockAnomalies.anomalies[0].influencers)).toEqual('root');
  });

  test('returns null if there are no influencers from the mock', () => {
    expect(getUserNameFromInfluencers([])).toEqual(null);
  });

  test('returns null if it is given undefined influencers', () => {
    expect(getUserNameFromInfluencers()).toEqual(null);
  });

  test('returns null if there influencers is an empty object', () => {
    expect(getUserNameFromInfluencers([{}])).toEqual(null);
  });

  test('returns user name mixed with other data', () => {
    const userName = getUserNameFromInfluencers([
      { 'user.name': 'root' },
      { 'source.ip': '127.0.0.1' },
    ]);
    expect(userName).toEqual('root');
  });
});

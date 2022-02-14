/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { getUserNameFromInfluencers } from './get_user_name_from_influencers';
import { mockAnomalies } from '../mock';

describe('get_user_name_from_influencers', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('returns user names from influencers from the mock', () => {
    const userName = getUserNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(userName).toEqual('root');
  });

  test('returns null if there are no influencers from the mock', () => {
    anomalies.anomalies[0].influencers = [];
    const userName = getUserNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(userName).toEqual(null);
  });

  test('returns null if it is given undefined influencers', () => {
    const userName = getUserNameFromInfluencers();
    expect(userName).toEqual(null);
  });

  test('returns null if there influencers is an empty object', () => {
    anomalies.anomalies[0].influencers = [{}];
    const userName = getUserNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(userName).toEqual(null);
  });

  test('returns user name mixed with other data', () => {
    anomalies.anomalies[0].influencers = [{ 'user.name': 'root' }, { 'source.ip': '127.0.0.1' }];
    const userName = getUserNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(userName).toEqual('root');
  });
});

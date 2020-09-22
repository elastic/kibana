/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { getNetworkFromInfluencers } from './get_network_from_influencers';
import { mockAnomalies } from '../mock';
import { DestinationOrSource } from '../types';

describe('get_network_from_influencers', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('returns null if there are no influencers from the mock', () => {
    anomalies.anomalies[0].influencers = [];
    const network = getNetworkFromInfluencers(anomalies.anomalies[0].influencers);
    expect(network).toEqual(null);
  });

  test('returns null if the influencers is an empty object', () => {
    anomalies.anomalies[0].influencers = [{}];
    const network = getNetworkFromInfluencers(anomalies.anomalies[0].influencers);
    expect(network).toEqual(null);
  });

  test('returns null if the influencers are undefined', () => {
    const network = getNetworkFromInfluencers();
    expect(network).toEqual(null);
  });

  test('returns network name of source mixed with other data', () => {
    anomalies.anomalies[0].influencers = [{ 'host.name': 'name-1' }, { 'source.ip': '127.0.0.1' }];
    const network = getNetworkFromInfluencers(anomalies.anomalies[0].influencers);
    const expected: { ip: string; type: DestinationOrSource } = {
      ip: '127.0.0.1',
      type: 'source.ip',
    };
    expect(network).toEqual(expected);
  });

  test('returns network name mixed with other data', () => {
    anomalies.anomalies[0].influencers = [
      { 'host.name': 'name-1' },
      { 'destination.ip': '127.0.0.1' },
    ];
    const network = getNetworkFromInfluencers(anomalies.anomalies[0].influencers);
    const expected: { ip: string; type: DestinationOrSource } = {
      ip: '127.0.0.1',
      type: 'destination.ip',
    };
    expect(network).toEqual(expected);
  });
});

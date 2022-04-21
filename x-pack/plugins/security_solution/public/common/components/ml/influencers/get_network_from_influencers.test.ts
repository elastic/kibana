/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNetworkFromInfluencers } from './get_network_from_influencers';
import { DestinationOrSource } from '../types';

describe('get_network_from_influencers', () => {
  test('returns null if there are no influencers', () => {
    expect(getNetworkFromInfluencers([])).toEqual(null);
  });

  test('returns null if the influencers is an empty object', () => {
    expect(getNetworkFromInfluencers([{}])).toEqual(null);
  });

  test('returns null if the influencers are undefined', () => {
    expect(getNetworkFromInfluencers()).toEqual(null);
  });

  test('returns network name of source mixed with other data', () => {
    const network = getNetworkFromInfluencers([
      { 'host.name': 'name-1' },
      { 'source.ip': '127.0.0.1' },
    ]);
    const expected: { ip: string; type: DestinationOrSource } = {
      ip: '127.0.0.1',
      type: 'source.ip',
    };
    expect(network).toEqual(expected);
  });

  test('returns network name mixed with other data', () => {
    const network = getNetworkFromInfluencers([
      { 'host.name': 'name-1' },
      { 'destination.ip': '127.0.0.1' },
    ]);
    const expected: { ip: string; type: DestinationOrSource } = {
      ip: '127.0.0.1',
      type: 'destination.ip',
    };
    expect(network).toEqual(expected);
  });
});

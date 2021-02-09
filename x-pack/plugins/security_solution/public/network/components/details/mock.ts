/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NetworkDetailsStrategyResponse } from '../../../../common/search_strategy';

export const mockData: Readonly<
  Record<string, NetworkDetailsStrategyResponse['networkDetails']>
> = {
  complete: {
    source: {
      firstSeen: '2019-02-07T17:19:41.636Z',
      lastSeen: '2019-02-07T17:19:41.636Z',
      autonomousSystem: { organization: { name: 'Test Org' }, number: 12345 },
      geo: {
        continent_name: ['North America'],
        city_name: ['New York'],
        country_iso_code: ['US'],
        country_name: undefined,
        location: {
          lat: [40.7214],
          lon: [-74.0052],
        },
        region_iso_code: ['US-NY'],
        region_name: ['New York'],
      },
    },
    destination: {
      firstSeen: '2019-02-07T17:19:41.648Z',
      lastSeen: '2019-02-07T17:19:41.648Z',
      autonomousSystem: { organization: { name: 'Test Org' }, number: 12345 },
      geo: {
        continent_name: ['North America'],
        city_name: ['New York'],
        country_iso_code: ['US'],
        country_name: undefined,
        location: {
          lat: [40.7214],
          lon: [-74.0052],
        },
        region_iso_code: ['US-NY'],
        region_name: ['New York'],
      },
    },
    host: {
      os: {
        kernel: ['4.14.50-v7+'],
        name: ['Raspbian GNU/Linux'],
        family: [''],
        version: ['9 (stretch)'],
        platform: ['raspbian'],
      },
      name: ['raspberrypi'],
      id: ['b19a781f683541a7a25ee345133aa399'],
      ip: ['10.10.10.10'],
      architecture: ['armv7l'],
    },
  },
};

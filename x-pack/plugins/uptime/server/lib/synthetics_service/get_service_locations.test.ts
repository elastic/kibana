/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { getServiceLocations } from './get_service_locations';
import { BandwidthLimitKey } from '../../../common/runtime_types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('getServiceLocations', function () {
  mockedAxios.get.mockRejectedValue('Network error: Something went wrong');
  mockedAxios.get.mockResolvedValue({
    data: {
      throttling: {
        [BandwidthLimitKey.DOWNLOAD]: 100,
        [BandwidthLimitKey.UPLOAD]: 50,
      },
      locations: {
        us_central: {
          url: 'https://local.dev',
          geo: {
            name: 'US Central',
            location: { lat: 41.25, lon: -95.86 },
          },
          status: 'beta',
        },
      },
    },
  });

  it('should return parsed locations and throttling', async () => {
    const locations = await getServiceLocations({
      config: {
        service: {
          manifestUrl: 'http://local.dev',
        },
      },
      // @ts-ignore
      logger: {
        error: jest.fn(),
      },
    });

    expect(locations).toEqual({
      throttling: {
        [BandwidthLimitKey.DOWNLOAD]: 100,
        [BandwidthLimitKey.UPLOAD]: 50,
      },
      locations: [
        {
          geo: {
            lat: 41.25,
            lon: -95.86,
          },
          id: 'us_central',
          label: 'US Central',
          url: 'https://local.dev',
          isServiceManaged: true,
        },
      ],
    });
  });
});

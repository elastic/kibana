/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { getServiceLocations } from './get_service_locations';

import { BandwidthLimitKey, LocationStatus } from '../../common/runtime_types';

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
          status: LocationStatus.GA,
        },
        us_east: {
          url: 'https://local.dev',
          geo: {
            name: 'US East',
            location: { lat: 41.25, lon: -95.86 },
          },
          status: LocationStatus.EXPERIMENTAL,
        },
      },
    },
  });

  describe('when out of production', () => {
    it('should return all locations regardless of the `showExperimentalLocations` key', async () => {
      const locations = await getServiceLocations({
        isDev: true,
        config: {
          service: {
            manifestUrl: 'http://local.dev',
            showExperimentalLocations: false,
          },
          enabled: true,
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
            isInvalid: false,
            label: 'US Central',
            url: 'https://local.dev',
            isServiceManaged: true,
            status: LocationStatus.GA,
          },
          {
            geo: {
              lat: 41.25,
              lon: -95.86,
            },
            id: 'us_east',
            isInvalid: false,
            label: 'US East',
            url: 'https://local.dev',
            isServiceManaged: true,
            status: LocationStatus.EXPERIMENTAL,
          },
        ],
      });
    });
  });

  describe('when in production', () => {
    it('should return only GA locations and throttling when `showExperimentalLocations` is set to false', async () => {
      const locations = await getServiceLocations({
        isDev: false,
        config: {
          service: {
            manifestUrl: 'http://local.dev',
            showExperimentalLocations: false,
          },
          enabled: true,
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
            isInvalid: false,
            label: 'US Central',
            url: 'https://local.dev',
            isServiceManaged: true,
            status: LocationStatus.GA,
          },
        ],
      });
    });

    it('should return all locations and throttling when `showExperimentalLocations` flag is set to true', async () => {
      const locations = await getServiceLocations({
        isDev: false,
        config: {
          service: {
            manifestUrl: 'http://local.dev',
            showExperimentalLocations: true,
          },
          enabled: true,
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
            isInvalid: false,
            label: 'US Central',
            url: 'https://local.dev',
            isServiceManaged: true,
            status: LocationStatus.GA,
          },
          {
            geo: {
              lat: 41.25,
              lon: -95.86,
            },
            id: 'us_east',
            isInvalid: false,
            label: 'US East',
            url: 'https://local.dev',
            isServiceManaged: true,
            status: LocationStatus.EXPERIMENTAL,
          },
        ],
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataStream,
  ScreenshotOption,
  Locations,
  PushBrowserMonitor,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { normalizePushedMonitors } from './browser';

describe('browser normalizers', () => {
  describe('normalize push monitors', () => {
    const locations: Locations = [
      {
        id: 'us_central',
        label: 'Test Location',
        geo: { lat: 33.333, lon: 73.333 },
        url: 'test-url',
        isServiceManaged: true,
      },
      {
        id: 'us_east',
        label: 'Test Location',
        geo: { lat: 33.333, lon: 73.333 },
        url: 'test-url',
        isServiceManaged: true,
      },
    ];
    const monitors: PushBrowserMonitor[] = [
      {
        id: 'test-id-1',
        screenshots: ScreenshotOption.OFF,
        name: 'test-name-1',
        content: 'test content 1',
        schedule: '3m',
        throttling: {
          latency: 20,
          upload: 10,
          download: 5,
        },
        locations: ['US Central'],
        tags: ['tag1', 'tag2'],
        ignoreHTTPSErrors: true,
        apmServiceName: 'cart-service',
      },
      {
        id: 'test-id-2',
        screenshots: ScreenshotOption.ON,
        name: 'test-name-2',
        content: 'test content 2',
        schedule: '10m',
        throttling: {
          latency: 18,
          upload: 15,
          download: 10,
        },
        locations: ['US Central', 'US East'],
        tags: ['tag3', 'tag4'],
        ignoreHTTPSErrors: false,
        apmServiceName: 'bean-service',
      },
    ];

    it('properly normalizes browser monitor', () => {
      const actual = normalizePushedMonitors({ locations, monitors });
      expect(actual).toEqual([
        {
          ...DEFAULT_FIELDS[DataStream.BROWSER],
          journey_id: 'test-id-1',
          ignore_https_errors: true,
          is_push_monitor: true,
          locations: [
            {
              geo: {
                lat: 33.333,
                lon: 73.333,
              },
              id: 'us_central',
              isServiceManaged: true,
              label: 'Test Location',
              url: 'test-url',
            },
          ],
          name: 'test-name-1',
          schedule: {
            number: '3',
            unit: 'm',
          },
          screenshots: 'off',
          'service.name': 'cart-service',
          'source.push.content': 'test content 1',
          tags: ['tag1', 'tag2'],
          'throttling.config': '5d/10u/20l',
          'throttling.download_speed': '5',
          'throttling.is_enabled': true,
          'throttling.latency': '20',
          'throttling.upload_speed': '10',
          type: 'browser',
        },
        {
          ...DEFAULT_FIELDS[DataStream.BROWSER],
          JOURNEY_ID: 'test-id-2',
          ignore_https_errors: false,
          is_push_monitor: true,
          locations: [
            {
              geo: {
                lat: 33.333,
                lon: 73.333,
              },
              id: 'us_central',
              isServiceManaged: true,
              label: 'Test Location',
              url: 'test-url',
            },
            {
              geo: {
                lat: 33.333,
                lon: 73.333,
              },
              id: 'us_east',
              isServiceManaged: true,
              label: 'Test Location',
              url: 'test-url',
            },
          ],
          name: 'test-name-2',
          params: '',
          schedule: {
            number: '10',
            unit: 'm',
          },
          screenshots: 'on',
          'service.name': 'bean-service',
          'source.push.content': 'test content 2',
          tags: ['tag3', 'tag4'],
          'throttling.config': '10d/15u/18l',
          'throttling.download_speed': '10',
          'throttling.is_enabled': true,
          'throttling.latency': '18',
          'throttling.upload_speed': '15',
          type: 'browser',
        },
      ]);
    });
  });
});

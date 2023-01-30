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
  LocationStatus,
  ProjectMonitor,
  PrivateLocation,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { normalizeProjectMonitors } from '.';

describe('browser normalizers', () => {
  describe('normalize push monitors', () => {
    const testHash = 'ljlkj';
    const playwrightOptions = {
      headless: true,
    };
    const params = {
      url: 'test-url',
    };
    const projectId = 'test-project-id';
    const locations: Locations = [
      {
        id: 'us_central',
        label: 'Test Location',
        geo: { lat: 33.333, lon: 73.333 },
        url: 'test-url',
        isServiceManaged: true,
        status: LocationStatus.GA,
      },
      {
        id: 'us_east',
        label: 'Test Location',
        geo: { lat: 33.333, lon: 73.333 },
        url: 'test-url',
        isServiceManaged: true,
        status: LocationStatus.GA,
      },
    ];
    const privateLocations: PrivateLocation[] = [
      {
        id: 'germany',
        label: 'Germany',
        isServiceManaged: false,
        concurrentMonitors: 1,
        agentPolicyId: 'germany',
      },
    ];
    const monitors: ProjectMonitor[] = [
      {
        id: 'test-id-1',
        screenshot: ScreenshotOption.OFF,
        name: 'test-name-1',
        content: 'test content 1',
        schedule: 3,
        throttling: {
          latency: 20,
          upload: 10,
          download: 5,
        },
        locations: ['us_central'],
        tags: ['tag1', 'tag2'],
        ignoreHTTPSErrors: true,
        hash: testHash,
      } as ProjectMonitor, // test that normalizers defaults to browser when type is omitted
      {
        id: 'test-id-2',
        screenshot: ScreenshotOption.ON,
        name: 'test-name-2',
        content: 'test content 2',
        schedule: 10,
        throttling: {
          latency: 18,
          upload: 15,
          download: 10,
        },
        params: {},
        playwrightOptions: {},
        locations: ['us_central', 'us_east'],
        tags: ['tag3', 'tag4'],
        ignoreHTTPSErrors: false,
        type: DataStream.BROWSER,
        hash: testHash,
      },
      {
        id: 'test-id-3',
        screenshot: ScreenshotOption.ON,
        name: 'test-name-3',
        content: 'test content 3',
        schedule: 10,
        throttling: false,
        params,
        playwrightOptions,
        locations: ['us_central', 'us_east'],
        privateLocations: ['Germany'],
        tags: ['tag3', 'tag4'],
        ignoreHTTPSErrors: false,
        type: DataStream.BROWSER,
        hash: testHash,
      },
    ];

    it('properly normalizes browser monitor', () => {
      const actual = normalizeProjectMonitors({
        locations,
        privateLocations,
        monitors,
        projectId,
        namespace: 'test-space',
        version: '8.5.0',
      });
      expect(actual).toEqual([
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.BROWSER],
            journey_id: 'test-id-1',
            ignore_https_errors: true,
            origin: 'project',
            locations: [
              {
                geo: {
                  lat: 33.333,
                  lon: 73.333,
                },
                id: 'us_central',
                isServiceManaged: true,
                label: 'Test Location',
              },
            ],
            name: 'test-name-1',
            schedule: {
              number: '3',
              unit: 'm',
            },
            screenshots: 'off',
            'service.name': '',
            'source.project.content': 'test content 1',
            tags: ['tag1', 'tag2'],
            'throttling.config': '5d/10u/20l',
            'throttling.download_speed': '5',
            'throttling.is_enabled': true,
            'throttling.latency': '20',
            'throttling.upload_speed': '10',
            params: '',
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-1-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
          },
          unsupportedKeys: [],
          errors: [],
        },
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.BROWSER],
            journey_id: 'test-id-2',
            ignore_https_errors: false,
            origin: 'project',
            locations: [
              {
                geo: {
                  lat: 33.333,
                  lon: 73.333,
                },
                id: 'us_central',
                isServiceManaged: true,
                label: 'Test Location',
              },
              {
                geo: {
                  lat: 33.333,
                  lon: 73.333,
                },
                id: 'us_east',
                isServiceManaged: true,
                label: 'Test Location',
              },
            ],
            name: 'test-name-2',
            params: '',
            playwright_options: '',
            schedule: {
              number: '10',
              unit: 'm',
            },
            screenshots: 'on',
            'service.name': '',
            'source.project.content': 'test content 2',
            tags: ['tag3', 'tag4'],
            'throttling.config': '10d/15u/18l',
            'throttling.download_speed': '10',
            'throttling.is_enabled': true,
            'throttling.latency': '18',
            'throttling.upload_speed': '15',
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-2-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
          },
          unsupportedKeys: [],
          errors: [],
        },
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.BROWSER],
            journey_id: 'test-id-3',
            ignore_https_errors: false,
            origin: 'project',
            locations: [
              {
                geo: {
                  lat: 33.333,
                  lon: 73.333,
                },
                id: 'us_central',
                isServiceManaged: true,
                label: 'Test Location',
              },
              {
                geo: {
                  lat: 33.333,
                  lon: 73.333,
                },
                id: 'us_east',
                isServiceManaged: true,
                label: 'Test Location',
              },
              {
                id: 'germany',
                isServiceManaged: false,
                label: 'Germany',
              },
            ],
            name: 'test-name-3',
            params: JSON.stringify(params),
            playwright_options: JSON.stringify(playwrightOptions),
            schedule: {
              number: '10',
              unit: 'm',
            },
            screenshots: 'on',
            'service.name': '',
            'source.project.content': 'test content 3',
            tags: ['tag3', 'tag4'],
            'throttling.config': '5d/3u/20l',
            'throttling.download_speed': '5',
            'throttling.is_enabled': false,
            'throttling.latency': '20',
            'throttling.upload_speed': '3',
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-3-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
          },
          unsupportedKeys: [],
          errors: [],
        },
      ]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MonitorTypeEnum,
  ScreenshotOption,
  Locations,
  LocationStatus,
  ProjectMonitor,
} from '../../../../common/runtime_types';
import {
  DEFAULT_FIELDS,
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '../../../../common/constants/monitor_defaults';
import { normalizeProjectMonitors } from '.';
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';

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
    const privateLocations: PrivateLocationAttributes[] = [
      {
        id: 'germany',
        label: 'Germany',
        isServiceManaged: false,
        agentPolicyId: 'germany',
      },
    ];
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.BROWSER,
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
        type: MonitorTypeEnum.BROWSER,
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
        type: MonitorTypeEnum.BROWSER,
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
            ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
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
            params: '',
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-1-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
            throttling: {
              id: 'custom',
              label: 'Custom',
              value: {
                download: '5',
                latency: '20',
                upload: '10',
              },
            },
          },
          unsupportedKeys: [],
          errors: [],
        },
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
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
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-2-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
            throttling: {
              id: 'custom',
              label: 'Custom',
              value: {
                download: '10',
                latency: '18',
                upload: '15',
              },
            },
          },
          unsupportedKeys: [],
          errors: [],
        },
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
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
                agentPolicyId: 'germany',
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
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-3-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
            throttling: PROFILES_MAP[PROFILE_VALUES_ENUM.NO_THROTTLING],
          },
          unsupportedKeys: [],
          errors: [],
        },
      ]);
    });

    it('handles defined throttling values', () => {
      const actual = normalizeProjectMonitors({
        locations,
        privateLocations,
        monitors: [
          {
            ...monitors[0],
            throttling: {
              download: 9,
              upload: 0.75,
              latency: 170,
            },
          },
        ],
        projectId,
        namespace: 'test-space',
        version: '8.5.0',
      });
      expect(actual).toEqual([
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
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
            params: '',
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-1-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
            throttling: {
              id: '4g',
              label: '4G',
              value: {
                download: '9',
                latency: '170',
                upload: '0.75',
              },
            },
          },
          unsupportedKeys: [],
          errors: [],
        },
      ]);
    });

    it('handles custom throttling values', () => {
      const actual = normalizeProjectMonitors({
        locations,
        privateLocations,
        monitors: [
          {
            ...monitors[0],
            throttling: {
              download: 10,
              upload: 5,
              latency: 30,
            },
          },
        ],
        projectId,
        namespace: 'test-space',
        version: '8.5.0',
      });
      expect(actual).toEqual([
        {
          normalizedFields: {
            ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
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
            params: '',
            type: 'browser',
            project_id: projectId,
            namespace: 'test_space',
            original_space: 'test-space',
            custom_heartbeat_id: 'test-id-1-test-project-id-test-space',
            timeout: null,
            id: '',
            hash: testHash,
            throttling: {
              id: 'custom',
              label: 'Custom',
              value: {
                download: '10',
                latency: '30',
                upload: '5',
              },
            },
          },
          unsupportedKeys: [],
          errors: [],
        },
      ]);
    });
  });
});

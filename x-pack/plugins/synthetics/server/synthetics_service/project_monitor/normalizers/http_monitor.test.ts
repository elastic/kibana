/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import {
  DataStream,
  Locations,
  LocationStatus,
  PrivateLocation,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { normalizeProjectMonitors } from '.';

describe('http normalizers', () => {
  const testHash = 'ljlkj';
  describe('normalize push monitors', () => {
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
    const monitors = [
      {
        locations: ['localhost'],
        type: 'http',
        enabled: false,
        id: 'my-monitor-2',
        name: 'My Monitor 2',
        urls: ['http://localhost:9200', 'http://anotherurl:9200'],
        schedule: 60,
        timeout: '80s',
        'check.request': {
          method: 'POST',
          body: {
            json: 'body',
          },
          headers: {
            'a-header': 'a-header-value',
          },
        },
        response: {
          include_body: 'always',
        },
        'response.include_headers': false,
        'check.response': {
          status: [200],
          body: ['Saved', 'saved'],
        },
        unsupportedKey: {
          nestedUnsupportedKey: 'unsupportedValue',
        },
        service: {
          name: 'test service',
        },
        ssl: {
          supported_protocols: ['TLSv1.2', 'TLSv1.3'],
        },
        hash: testHash,
      },
      {
        locations: ['localhost'],
        type: 'http',
        enabled: false,
        id: 'my-monitor-3',
        name: 'My Monitor 3',
        urls: ['http://localhost:9200'],
        schedule: 60,
        timeout: '80s',
        'check.request': {
          method: 'POST',
          body: 'sometextbody',
          headers: {
            'a-header': 'a-header-value',
          },
        },
        response: {
          include_body: 'always',
        },
        tags: 'tag2,tag2',
        'response.include_headers': false,
        'check.response': {
          status: [200],
          body: {
            positive: ['Saved', 'saved'],
          },
        },
        'service.name': 'test service',
        'ssl.supported_protocols': 'TLSv1.2,TLSv1.3',
        hash: testHash,
      },
    ];

    it('properly normalizes http monitors', () => {
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
          errors: [
            {
              details:
                'Multiple urls are not supported for http project monitors in 8.5.0. Please set only 1 url per monitor. You monitor was not created or updated.',
              id: 'my-monitor-2',
              reason: 'Unsupported Heartbeat option',
            },
            {
              details:
                'The following Heartbeat options are not supported for http project monitors in 8.5.0: check.response.body|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.',
              id: 'my-monitor-2',
              reason: 'Unsupported Heartbeat option',
            },
          ],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.HTTP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.request.body': {
              type: 'json',
              value: '{"json":"body"}',
            },
            'check.request.headers': {
              'a-header': 'a-header-value',
            },
            'check.request.method': 'POST',
            'check.response.body.negative': [],
            'check.response.body.positive': [],
            'check.response.headers': {},
            'check.response.status': ['200'],
            config_id: '',
            custom_heartbeat_id: 'my-monitor-2-test-project-id-test-space',
            enabled: false,
            form_monitor_type: 'http',
            journey_id: 'my-monitor-2',
            locations: [],
            max_redirects: '0',
            name: 'My Monitor 2',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            password: '',
            project_id: 'test-project-id',
            proxy_url: '',
            'response.include_body': 'always',
            'response.include_headers': false,
            schedule: {
              number: '60',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: [],
            timeout: '80',
            type: 'http',
            urls: 'http://localhost:9200',
            'url.port': null,
            username: '',
            id: '',
            hash: testHash,
          },
          unsupportedKeys: ['check.response.body', 'unsupportedKey.nestedUnsupportedKey'],
        },
        {
          errors: [],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.HTTP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.request.body': {
              type: 'text',
              value: 'sometextbody',
            },
            'check.request.headers': {
              'a-header': 'a-header-value',
            },
            'check.request.method': 'POST',
            'check.response.body.negative': [],
            'check.response.body.positive': ['Saved', 'saved'],
            'check.response.headers': {},
            'check.response.status': ['200'],
            config_id: '',
            custom_heartbeat_id: 'my-monitor-3-test-project-id-test-space',
            enabled: false,
            form_monitor_type: 'http',
            journey_id: 'my-monitor-3',
            locations: [],
            max_redirects: '0',
            name: 'My Monitor 3',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            password: '',
            project_id: 'test-project-id',
            proxy_url: '',
            'response.include_body': 'always',
            'response.include_headers': false,
            schedule: {
              number: '60',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['tag2', 'tag2'],
            timeout: '80',
            type: 'http',
            urls: 'http://localhost:9200',
            'url.port': null,
            username: '',
            id: '',
            hash: testHash,
          },
          unsupportedKeys: [],
        },
      ]);
    });

    it('sets is_tls_enabled appropriately', () => {
      const actual = normalizeProjectMonitors({
        locations,
        privateLocations,
        monitors: [monitors[0], { ...omit(monitors[1], ['ssl.supported_protocols']) }],
        projectId,
        namespace: 'test-space',
        version: '8.5.0',
      });
      expect(actual).toEqual([
        {
          errors: [
            {
              details:
                '`http` project monitors must have exactly one value for field `urls` in version `8.5.0`. Your monitor was not created or updated.',
              id: 'my-monitor-2',
              reason: 'Invalid Heartbeat configuration',
            },
            {
              details:
                'The following Heartbeat options are not supported for http project monitors in 8.5.0: check.response.body|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.',
              id: 'my-monitor-2',
              reason: 'Unsupported Heartbeat option',
            },
          ],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.HTTP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.request.body': {
              type: 'json',
              value: '{"json":"body"}',
            },
            'check.request.headers': {
              'a-header': 'a-header-value',
            },
            'check.request.method': 'POST',
            'check.response.body.negative': [],
            'check.response.body.positive': [],
            'check.response.headers': {},
            'check.response.status': ['200'],
            config_id: '',
            custom_heartbeat_id: 'my-monitor-2-test-project-id-test-space',
            enabled: false,
            form_monitor_type: 'http',
            journey_id: 'my-monitor-2',
            locations: [],
            max_redirects: '0',
            name: 'My Monitor 2',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            password: '',
            project_id: 'test-project-id',
            proxy_url: '',
            'response.include_body': 'always',
            'response.include_headers': false,
            schedule: {
              number: '60',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: [],
            timeout: '80',
            type: 'http',
            urls: 'http://localhost:9200',
            'url.port': null,
            username: '',
            id: '',
            hash: testHash,
          },
          unsupportedKeys: ['check.response.body', 'unsupportedKey.nestedUnsupportedKey'],
        },
        {
          errors: [],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.HTTP],
            __ui: {
              is_tls_enabled: false,
            },
            'check.request.body': {
              type: 'text',
              value: 'sometextbody',
            },
            'check.request.headers': {
              'a-header': 'a-header-value',
            },
            'check.request.method': 'POST',
            'check.response.body.negative': [],
            'check.response.body.positive': ['Saved', 'saved'],
            'check.response.headers': {},
            'check.response.status': ['200'],
            config_id: '',
            custom_heartbeat_id: 'my-monitor-3-test-project-id-test-space',
            enabled: false,
            form_monitor_type: 'http',
            journey_id: 'my-monitor-3',
            locations: [],
            max_redirects: '0',
            name: 'My Monitor 3',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            password: '',
            project_id: 'test-project-id',
            proxy_url: '',
            'response.include_body': 'always',
            'response.include_headers': false,
            schedule: {
              number: '60',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['tag2', 'tag2'],
            timeout: '80',
            type: 'http',
            urls: 'http://localhost:9200',
            'url.port': null,
            username: '',
            id: '',
            hash: testHash,
          },
          unsupportedKeys: [],
        },
      ]);
    });
  });
});

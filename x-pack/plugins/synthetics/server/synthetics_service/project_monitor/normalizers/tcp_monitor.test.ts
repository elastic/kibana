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

describe('tcp normalizers', () => {
  describe('normalize push monitors', () => {
    const testHash = 'lleklrkelkj';
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
        locations: ['us_central'],
        type: 'tcp',
        id: 'gmail-smtp',
        name: 'GMail SMTP',
        hosts: ['smtp.gmail.com:587'],
        schedule: 1,
        tags: ['service:smtp', 'org:google'],
        privateLocations: ['BEEP'],
        'service.name': 'test service',
        'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
        hash: testHash,
      },
      {
        locations: ['us_central'],
        type: 'tcp',
        id: 'always-down',
        name: 'Always Down',
        hosts: 'localhost:18278',
        schedule: 1,
        tags: 'tag1,tag2',
        privateLocations: ['BEEP'],
        service: {
          name: 'test service',
        },
        ssl: {
          supported_protocols: 'TLSv1.2,TLSv1.3',
        },
        hash: testHash,
      },
      {
        locations: ['us_central'],
        type: 'tcp',
        id: 'always-down',
        name: 'Always Down',
        hosts: ['localhost', 'anotherhost'],
        ports: ['5698'],
        schedule: 1,
        tags: 'tag1,tag2',
        privateLocations: ['BEEP'],
        unsupportedKey: {
          nestedUnsupportedKey: 'unnsuportedValue',
        },
        hash: testHash,
      },
    ];

    it('properly normalizes tcp monitors', () => {
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
          errors: [],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.TCP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.receive': '',
            'check.send': '',
            config_id: '',
            custom_heartbeat_id: 'gmail-smtp-test-project-id-test-space',
            enabled: true,
            form_monitor_type: 'tcp',
            hosts: 'smtp.gmail.com:587',
            'url.port': null,
            journey_id: 'gmail-smtp',
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
            name: 'GMail SMTP',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            project_id: 'test-project-id',
            proxy_url: '',
            proxy_use_local_resolver: false,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['service:smtp', 'org:google'],
            timeout: '16',
            type: 'tcp',
            id: '',
            urls: '',
            hash: testHash,
          },
          unsupportedKeys: [],
        },
        {
          errors: [],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.TCP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.receive': '',
            'check.send': '',
            config_id: '',
            custom_heartbeat_id: 'always-down-test-project-id-test-space',
            enabled: true,
            form_monitor_type: 'tcp',
            hosts: 'localhost:18278',
            'url.port': null,
            journey_id: 'always-down',
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
            name: 'Always Down',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            project_id: 'test-project-id',
            proxy_url: '',
            proxy_use_local_resolver: false,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['tag1', 'tag2'],
            timeout: '16',
            type: 'tcp',
            id: '',
            urls: '',
            hash: testHash,
          },
          unsupportedKeys: [],
        },
        {
          errors: [
            {
              details:
                '`tcp` project monitors must have exactly one value for field `hosts` in version `8.5.0`. Your monitor was not created or updated.',
              id: 'always-down',
              reason: 'Invalid Heartbeat configuration',
            },
            {
              details:
                'The following Heartbeat options are not supported for tcp project monitors in 8.5.0: ports|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.',
              id: 'always-down',
              reason: 'Unsupported Heartbeat option',
            },
          ],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.TCP],
            __ui: {
              is_tls_enabled: false,
            },
            'check.receive': '',
            'check.send': '',
            config_id: '',
            custom_heartbeat_id: 'always-down-test-project-id-test-space',
            enabled: true,
            form_monitor_type: 'tcp',
            hosts: 'localhost',
            'url.port': null,
            journey_id: 'always-down',
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
            name: 'Always Down',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            project_id: 'test-project-id',
            proxy_url: '',
            proxy_use_local_resolver: false,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': '',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['tag1', 'tag2'],
            timeout: '16',
            type: 'tcp',
            id: '',
            urls: '',
            hash: testHash,
          },
          unsupportedKeys: ['ports', 'unsupportedKey.nestedUnsupportedKey'],
        },
      ]);
    });

    it('sets is_tls_enabled appropriately', () => {
      const actual = normalizeProjectMonitors({
        locations,
        privateLocations,
        monitors: [monitors[0], monitors[1], { ...omit(monitors[2], ['ssl.supported_protocols']) }],
        projectId,
        namespace: 'test-space',
        version: '8.5.0',
      });
      expect(actual).toEqual([
        {
          errors: [],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.TCP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.receive': '',
            'check.send': '',
            config_id: '',
            custom_heartbeat_id: 'gmail-smtp-test-project-id-test-space',
            enabled: true,
            form_monitor_type: 'tcp',
            hosts: 'smtp.gmail.com:587',
            'url.port': null,
            journey_id: 'gmail-smtp',
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
            name: 'GMail SMTP',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            project_id: 'test-project-id',
            proxy_url: '',
            proxy_use_local_resolver: false,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['service:smtp', 'org:google'],
            timeout: '16',
            type: 'tcp',
            id: '',
            urls: '',
            hash: testHash,
          },
          unsupportedKeys: [],
        },
        {
          errors: [],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.TCP],
            __ui: {
              is_tls_enabled: true,
            },
            'check.receive': '',
            'check.send': '',
            config_id: '',
            custom_heartbeat_id: 'always-down-test-project-id-test-space',
            enabled: true,
            form_monitor_type: 'tcp',
            hosts: 'localhost:18278',
            'url.port': null,
            journey_id: 'always-down',
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
            name: 'Always Down',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            project_id: 'test-project-id',
            proxy_url: '',
            proxy_use_local_resolver: false,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': 'test service',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['tag1', 'tag2'],
            timeout: '16',
            type: 'tcp',
            id: '',
            urls: '',
            hash: testHash,
          },
          unsupportedKeys: [],
        },
        {
          errors: [
            {
              details:
                '`tcp` project monitors must have exactly one value for field `hosts` in version `8.5.0`. Your monitor was not created or updated.',
              id: 'always-down',
              reason: 'Invalid Heartbeat configuration',
            },
            {
              details:
                'The following Heartbeat options are not supported for tcp project monitors in 8.5.0: ports|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.',
              id: 'always-down',
              reason: 'Unsupported Heartbeat option',
            },
          ],
          normalizedFields: {
            ...DEFAULT_FIELDS[DataStream.TCP],
            __ui: {
              is_tls_enabled: false,
            },
            'check.receive': '',
            'check.send': '',
            config_id: '',
            custom_heartbeat_id: 'always-down-test-project-id-test-space',
            enabled: true,
            form_monitor_type: 'tcp',
            hosts: 'localhost',
            'url.port': null,
            journey_id: 'always-down',
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
            name: 'Always Down',
            namespace: 'test_space',
            origin: 'project',
            original_space: 'test-space',
            project_id: 'test-project-id',
            proxy_url: '',
            proxy_use_local_resolver: false,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': '',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            tags: ['tag1', 'tag2'],
            timeout: '16',
            type: 'tcp',
            id: '',
            urls: '',
            hash: testHash,
          },
          unsupportedKeys: ['ports', 'unsupportedKey.nestedUnsupportedKey'],
        },
      ]);
    });
  });
});

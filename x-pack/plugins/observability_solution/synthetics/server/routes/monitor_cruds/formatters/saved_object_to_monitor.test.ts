/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapSavedObjectToMonitor, mergeSourceMonitor } from './saved_object_to_monitor';
import { EncryptedSyntheticsMonitor } from '../../../../common/runtime_types';

describe('mergeSourceMonitor', () => {
  it('should merge keys', function () {
    const newData = {
      name: 'new-name',
      tags: ['a', 'b', 'c'],
    };
    const result = mergeSourceMonitor({ ...testMonitor }, newData as any);
    expect(result).toEqual({
      ...testMonitor,
      ...newData,
    });
  });

  it('should merge alert keys', () => {
    const result = mergeSourceMonitor({ ...testMonitor }, {
      alert: {
        status: {
          enabled: false,
        },
      },
    } as any);
    expect(result.alert).toEqual({
      status: {
        enabled: false,
      },
      tls: {
        enabled: true,
      },
    });
  });

  it('should merge locations keys', () => {
    const result = mergeSourceMonitor({ ...testMonitor }, {
      locations: [
        {
          geo: {
            lon: -95.86,
            lat: 41.25,
          },
          isServiceManaged: true,
          id: 'us_central_qa',
          label: 'North America - US Central',
        },
      ],
    } as any);
    expect(result.locations).toEqual([
      {
        geo: {
          lon: -95.86,
          lat: 41.25,
        },
        isServiceManaged: true,
        id: 'us_central_qa',
        label: 'North America - US Central',
      },
    ]);
  });

  it('should not omit null or undefined values', () => {
    const result = mapSavedObjectToMonitor({ monitor: { attributes: testMonitor } } as any);

    expect(result).toEqual({
      alert: {
        status: {
          enabled: true,
        },
        tls: {
          enabled: true,
        },
      },
      config_id: 'ae88f0aa-9c7d-4a5f-96dc-89d65a0ca947',
      custom_heartbeat_id: 'todos-lightweight-test-projects-default',
      enabled: true,
      id: 'todos-lightweight-test-projects-default',
      ipv4: true,
      ipv6: true,
      locations: ['us_central', 'us_east'],
      private_locations: ['pvt_us_east'],
      max_redirects: 0,
      mode: 'any',
      name: 'Todos Lightweight',
      namespace: 'default',
      original_space: 'default',
      proxy_url: '',
      retest_on_failure: true,
      revision: 21,
      schedule: {
        number: '3',
        unit: 'm',
      },
      'service.name': '',
      tags: [],
      timeout: '16',
      type: 'http',
      url: '${devUrl}',
      'url.port': null,
      ssl: {
        certificate: '',
        certificate_authorities: '',
        supported_protocols: ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        verification_mode: 'full',
        key: 'test-key',
      },
      response: {
        include_body: 'on_error',
        include_body_max_bytes: '1024',
        include_headers: true,
      },
      check: {
        request: {
          method: 'GET',
        },
        response: {
          status: ['404'],
        },
      },
      params: {},
    });
  });

  it('should not omit null or undefined values with ui', () => {
    const result = mapSavedObjectToMonitor({
      monitor: { attributes: { ...testMonitor } },
      internal: true,
    } as any);

    expect(result).toEqual({
      __ui: {
        is_tls_enabled: false,
      },
      alert: {
        status: {
          enabled: true,
        },
        tls: {
          enabled: true,
        },
      },
      'check.request.method': 'GET',
      'check.response.status': ['404'],
      config_id: 'ae88f0aa-9c7d-4a5f-96dc-89d65a0ca947',
      custom_heartbeat_id: 'todos-lightweight-test-projects-default',
      enabled: true,
      id: 'todos-lightweight-test-projects-default',
      ipv4: true,
      ipv6: true,
      locations: [
        {
          geo: {
            lon: -95.86,
            lat: 41.25,
          },
          isServiceManaged: true,
          id: 'us_central',
          label: 'North America - US Central',
        },
        {
          geo: {
            lon: -95.86,
            lat: 41.25,
          },
          isServiceManaged: true,
          id: 'us-east4-a',
          label: 'US East',
        },
        {
          geo: {
            lon: -95.86,
            lat: 41.25,
          },
          isServiceManaged: false,
          id: 'pvt_us_east',
          label: 'US East (Private)',
        },
      ],
      max_redirects: '0',
      mode: 'any',
      name: 'Todos Lightweight',
      namespace: 'default',
      original_space: 'default',
      project_id: 'test-projects',
      proxy_url: '',
      revision: 21,
      schedule: {
        number: '3',
        unit: 'm',
      },
      'service.name': '',
      'ssl.certificate': '',
      'ssl.certificate_authorities': '',
      'ssl.key': 'test-key',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      'ssl.verification_mode': 'full',
      'response.include_body': 'on_error',
      'response.include_body_max_bytes': '1024',
      'response.include_headers': true,
      tags: [],
      timeout: '16',
      type: 'http',
      'url.port': null,
      form_monitor_type: 'http',
      hash: 'f4b6u3Q/PMK5KzEtPeMNzXJBA46rt+yilohaAoqMzqk=',
      journey_id: 'todos-lightweight',
      max_attempts: 2,
      origin: 'project',
      urls: '${devUrl}',
    });
  });
});

const testMonitor = {
  type: 'http',
  form_monitor_type: 'http',
  enabled: true,
  alert: {
    status: {
      enabled: true,
    },
    tls: {
      enabled: true,
    },
  },
  schedule: {
    number: '3',
    unit: 'm',
  },
  'service.name': '',
  config_id: 'ae88f0aa-9c7d-4a5f-96dc-89d65a0ca947',
  tags: [],
  timeout: '16',
  name: 'Todos Lightweight',
  locations: [
    {
      geo: {
        lon: -95.86,
        lat: 41.25,
      },
      isServiceManaged: true,
      id: 'us_central',
      label: 'North America - US Central',
    },
    {
      geo: {
        lon: -95.86,
        lat: 41.25,
      },
      isServiceManaged: true,
      id: 'us-east4-a',
      label: 'US East',
    },
    {
      geo: {
        lon: -95.86,
        lat: 41.25,
      },
      isServiceManaged: false,
      id: 'pvt_us_east',
      label: 'US East (Private)',
    },
  ],
  namespace: 'default',
  origin: 'project',
  journey_id: 'todos-lightweight',
  hash: 'f4b6u3Q/PMK5KzEtPeMNzXJBA46rt+yilohaAoqMzqk=',
  id: 'todos-lightweight-test-projects-default',
  __ui: {
    is_tls_enabled: false,
  },
  urls: '${devUrl}',
  max_redirects: '0',
  max_attempts: 2,
  'url.port': null,
  proxy_url: '',
  'response.include_body': 'on_error',
  'response.include_headers': true,
  'check.response.status': ['404'],
  'check.request.method': 'GET',
  mode: 'any',
  'response.include_body_max_bytes': '1024',
  ipv4: true,
  ipv6: true,
  'ssl.certificate_authorities': '',
  'ssl.key': 'test-key',
  'ssl.certificate': '',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
  project_id: 'test-projects',
  original_space: 'default',
  custom_heartbeat_id: 'todos-lightweight-test-projects-default',
  revision: 21,
  created_at: '2023-06-15T10:00:09.650Z',
  updated_at: '2023-07-11T16:55:45.976Z',
} as EncryptedSyntheticsMonitor;

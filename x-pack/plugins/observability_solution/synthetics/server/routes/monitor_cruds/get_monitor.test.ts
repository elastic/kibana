/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOverviewConfigsPerLocation } from './get_monitor';
import { EncryptedSyntheticsMonitor } from '../../../common/runtime_types';

describe('getOverviewConfigsPerLocation', () => {
  it('returns a map of locations to monitor configs', () => {
    const result = getOverviewConfigsPerLocation(attributes as EncryptedSyntheticsMonitor);
    expect(result).toEqual([
      {
        configId: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
        id: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
        isEnabled: true,
        isStatusAlertEnabled: true,
        location: { id: 'us_central', isServiceManaged: true, label: 'North America - US Central' },
        name: 'https://simonhearne.com/',
        projectId: undefined,
        schedule: '3',
        tags: [],
        type: 'http',
      },
      {
        configId: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
        id: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
        isEnabled: true,
        isStatusAlertEnabled: true,
        location: { id: 'us_central_qa', isServiceManaged: true, label: 'US Central QA' },
        name: 'https://simonhearne.com/',
        projectId: undefined,
        schedule: '3',
        tags: [],
        type: 'http',
      },
    ]);
  });
  it('returns a map of locations to monitor configs with queried locations', () => {
    const result = getOverviewConfigsPerLocation(
      attributes as EncryptedSyntheticsMonitor,
      'us_central'
    );
    expect(result).toEqual([
      {
        configId: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
        id: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
        isEnabled: true,
        isStatusAlertEnabled: true,
        location: { id: 'us_central', isServiceManaged: true, label: 'North America - US Central' },
        name: 'https://simonhearne.com/',
        projectId: undefined,
        schedule: '3',
        tags: [],
        type: 'http',
      },
    ]);
  });
});

const attributes = {
  type: 'http',
  form_monitor_type: 'http',
  enabled: true,
  alert: { status: { enabled: true }, tls: { enabled: true } },
  schedule: { number: '3', unit: 'm' },
  'service.name': '',
  config_id: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
  tags: [],
  timeout: '16',
  name: 'https://simonhearne.com/',
  locations: [
    { isServiceManaged: true, id: 'us_central', label: 'North America - US Central' },
    { isServiceManaged: true, id: 'us_central_qa', label: 'US Central QA' },
  ],
  namespace: 'default',
  origin: 'ui',
  journey_id: '',
  hash: '',
  id: 'cfb51782-7152-43db-9986-02b34d5e5a8c',
  __ui: { is_tls_enabled: false },
  urls: 'https://simonhearne.com/',
  max_redirects: '0',
  max_attempts: 2,
  'url.port': null,
  proxy_url: '',
  'response.include_body': 'on_error',
  'response.include_headers': true,
  'check.response.status': [],
  'check.request.method': 'GET',
  mode: 'any',
  'response.include_body_max_bytes': '1024',
  ipv4: true,
  ipv6: true,
  'ssl.certificate_authorities': '',
  'ssl.certificate': '',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
  revision: 2,
};

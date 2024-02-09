/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, SyntheticsMonitor } from '../../../common/runtime_types';
import { hydrateMonitorFields } from './add_monitor';

describe('hydrateMonitorFields', () => {
  it('creates expected zip b64 project field value for inline browser monitor', async () => {
    const normalizedMonitor: SyntheticsMonitor = {
      // @ts-expect-error extra field
      type: 'browser',
      // @ts-expect-error extra field
      form_monitor_type: 'multistep',
      enabled: true,
      alert: { status: { enabled: true }, tls: { enabled: true } },
      // @ts-expect-error extra field
      schedule: { unit: 'm', number: '10' },
      'service.name': '',
      config_id: '',
      tags: [],
      timeout: null,
      name: 'test-once-more',
      locations: [{ id: 'dev', label: 'Dev Service', isServiceManaged: true }],
      namespace: 'default',
      // @ts-expect-error extra field
      origin: 'ui',
      journey_id: '',
      hash: '',
      id: '',
      params: '',
      max_attempts: 2,
      project_id: '',
      playwright_options: '',
      __ui: { script_source: { is_generated_script: false, file_name: '' } },
      'url.port': null,
      'source.inline.script': `step('goto', () => page.goto('https://elastic.co'))
step('fail', () => {
  throw Error('fail');
})`,
      'source.project.content': '',
      playwright_text_assertion: '',
      urls: '',
      screenshots: 'on',
      synthetics_args: [],
      'filter_journeys.match': '',
      'filter_journeys.tags': [],
      ignore_https_errors: false,
      throttling: {
        value: { download: '5', upload: '3', latency: '20' },
        id: 'default',
        label: 'Default',
      },
      'ssl.certificate_authorities': '',
      'ssl.certificate': '',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.verification_mode': 'full',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    };

    const hydratedMonitor = await hydrateMonitorFields({
      normalizedMonitor,
      newMonitorId: 'testMonitorId',
      routeContext: {
        // @ts-expect-error not checking request functionality
        request: {
          query: {
            preserve_namespace: true,
          },
        },
        server: {
          // @ts-expect-error not checking logger functionality
          logger: jest.fn(),
        },
      },
    });

    expect(hydratedMonitor[ConfigKey.SOURCE_PROJECT_CONTENT]).toBeDefined();
    // zip is not deterministic, so we can't check the exact value
    expect(hydratedMonitor[ConfigKey.SOURCE_PROJECT_CONTENT]).length.toBeGreaterThan(0);
  });

  it('does not add b64 zip data to lightweight monitors', async () => {
    const newMonitorId = 'testMonitorId';
    const routeContext = {
      request: {
        query: {
          preserve_namespace: true,
        },
      },
      server: {
        logger: jest.fn(),
      },
    };
    const normalizedMonitor: SyntheticsMonitor = {
      // @ts-expect-error extra field
      type: 'tcp',
      // @ts-expect-error extra field
      form_monitor_type: 'tcp',
      enabled: true,
      alert: { status: { enabled: true }, tls: { enabled: true } },
      // @ts-expect-error extra field
      schedule: { number: '3', unit: 'm' },
      'service.name': '',
      config_id: '',
      tags: [],
      timeout: '16',
      name: 'tcp://google.com:80',
      locations: [{ id: 'dev', label: 'Dev Service', isServiceManaged: true }],
      namespace: 'default',
      // @ts-expect-error extra field
      origin: 'ui',
      journey_id: '',
      hash: '',
      id: '',
      params: '',
      max_attempts: 2,
      __ui: { is_tls_enabled: false },
      hosts: 'tcp://google.com:80',
      urls: '',
      'url.port': null,
      proxy_url: '',
      proxy_use_local_resolver: false,
      'check.receive': '',
      'check.send': '',
      mode: 'any',
      ipv4: true,
      ipv6: true,
      'ssl.certificate_authorities': '',
      'ssl.certificate': '',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.verification_mode': 'full',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    };
    const hydratedMonitor = await hydrateMonitorFields({
      normalizedMonitor,
      newMonitorId,
      // @ts-expect-error not checking routeContext functionality
      routeContext,
    });

    expect(hydratedMonitor[ConfigKey.SOURCE_PROJECT_CONTENT]).toEqual('');
  });
});

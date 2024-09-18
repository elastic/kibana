/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { refreshInlineZip, syncEditedMonitor } from './edit_monitor';
import { SavedObject, SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import {
  BrowserSensitiveSimpleFields,
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { SyntheticsServerSetup } from '../../types';

jest.mock('../telemetry/monitor_upgrade_sender', () => ({
  sendTelemetryEvents: jest.fn(),
  formatTelemetryUpdateEvent: jest.fn(),
}));

describe('syncEditedMonitor', () => {
  const logger = loggerMock.create();

  const serverMock: SyntheticsServerSetup = {
    syntheticsEsClient: { search: jest.fn() },
    stackVersion: null,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    },
    logger,
    config: {
      service: {
        username: 'dev',
        password: '12345',
      },
    },
    fleet: {
      packagePolicyService: {
        get: jest.fn().mockReturnValue({}),
        getByIDs: jest.fn().mockReturnValue([]),
        buildPackagePolicyFromPackage: jest.fn().mockReturnValue({}),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  const editedMonitor = {
    type: 'http',
    enabled: true,
    schedule: {
      number: '3',
      unit: 'm',
    },
    name: 'my mon',
    locations: [
      {
        id: 'test_location',
        isServiceManaged: true,
      },
    ],
    urls: 'http://google.com',
    max_redirects: '0',
    password: '',
    proxy_url: '',
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
    fields_under_root: true,
  } as unknown as SyntheticsMonitor;

  const previousMonitor = {
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    attributes: { name: editedMonitor.name, locations: [] } as any,
    type: 'synthetics-monitor',
    references: [],
  } as SavedObject<EncryptedSyntheticsMonitorAttributes>;

  const syntheticsService = new SyntheticsService(serverMock);

  const syntheticsMonitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  syntheticsService.editConfig = jest.fn();

  it('includes the isEdit flag', async () => {
    await syncEditedMonitor({
      normalizedMonitor: editedMonitor,
      decryptedPreviousMonitor:
        previousMonitor as unknown as SavedObject<SyntheticsMonitorWithSecretsAttributes>,
      routeContext: {
        syntheticsMonitorClient,
        server: serverMock,
        request: {} as unknown as KibanaRequest,
        savedObjectsClient:
          serverMock.authSavedObjectsClient as unknown as SavedObjectsClientContract,
      } as any,
      spaceId: 'test-space',
    });

    expect(syntheticsService.editConfig).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          configId: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
        }),
      ])
    );

    expect(serverMock.authSavedObjectsClient?.update).toHaveBeenCalledWith(
      'synthetics-monitor',
      '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      expect.objectContaining({
        enabled: true,
      })
    );
  });
});

describe('refreshInlineZip', () => {
  it('refreshes the inline zip', async () => {
    const normalized: SyntheticsMonitor = {
      // @ts-expect-error extra field
      type: 'browser',
      // @ts-expect-error extra field
      form_monitor_type: 'multistep',
      enabled: true,
      alert: { status: { enabled: true }, tls: { enabled: true } },
      // @ts-expect-error extra field
      schedule: { unit: 'm', number: '10' },
      'service.name': '',
      config_id: '7be61e81-a29a-439d-877b-9ff694c60d1b',
      tags: [],
      timeout: null,
      name: 'test-again',
      locations: [{ id: 'dev', label: 'Dev Service', isServiceManaged: true }],
      namespace: 'default',
      // @ts-expect-error extra field
      origin: 'ui',
      journey_id: '',
      hash: '',
      id: '7be61e81-a29a-439d-877b-9ff694c60d1b',
      params: '',
      max_attempts: 2,
      project_id: '',
      playwright_options: '',
      __ui: { script_source: { is_generated_script: false, file_name: '' } },
      'url.port': null,
      'source.inline.script':
        "step('goto', ()=> page.goto('https://elastic.co'))\n" +
        "step('fail', () => {\n" +
        '    // add a comment\n' +
        "    throw Error('fail')\n" +
        '})',
      'source.project.content': `UEsDBBQACAAIAAiNSVgAAAAAAAAAAAAAAAARAAAAaW5saW5lLmpvdXJuZXkudHM1jsEKwjAQRO/5irmlgWDviuLFD4lhtZE2GzdbVEr/XVor7GmG92bTUFgUEx48SqaPR1UqHvQuFBUzbsID7Jn6UDXFtn6ydqQpVnswZoMam3KfMlmPZkIJd/KInJXe6nEVflUSjxIkDNVD6DlSVcwOxxMmg3WysXdWXgzueFoduyVobKda6r5ttw92ka1z5ofcQupX5G8CtBN+4SLCsvXOzMsdzBdQSwcIvqw1HaUAAADsAAAAUEsBAi0DFAAIAAgACI1JWL6sNR2lAAAA7AAAABEAAAAAAAAAAAAgAKSBAAAAAGlubGluZS5qb3VybmV5LnRzUEsFBgAAAAABAAEAPwAAAOQAAAAAAA==`,
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
      revision: 2,
    };
    const previous: SavedObject<EncryptedSyntheticsMonitorAttributes> = {
      id: '7be61e81-a29a-439d-877b-9ff694c60d1b',
      type: 'synthetics-monitor',
      namespaces: ['default'],
      migrationVersion: undefined,
      updated_at: '2024-02-09T17:40:17.708Z',
      created_at: '2024-02-09T17:40:17.708Z',
      version: 'WzQzMTAsMV0=',
      attributes: {
        // @ts-expect-error extra field
        type: 'browser',
        // @ts-expect-error extra field
        form_monitor_type: 'multistep',
        enabled: true,
        // @ts-expect-error extra field
        alert: { status: [Object], tls: [Object] },
        // @ts-expect-error extra field
        schedule: { unit: 'm', number: '10' },
        'service.name': '',
        config_id: '7be61e81-a29a-439d-877b-9ff694c60d1b',
        tags: [],
        timeout: null,
        name: 'test-again',
        namespace: 'default',
        // @ts-expect-error extra field
        origin: 'ui',
        journey_id: '',
        hash: '',
        id: '7be61e81-a29a-439d-877b-9ff694c60d1b',
        max_attempts: 2,
        project_id: '',
        playwright_options: '',
        __ui: { script_source: [Object] },
        'url.port': null,
        playwright_text_assertion: '',
        urls: '',
        screenshots: 'on',
        'filter_journeys.match': '',
        'filter_journeys.tags': [],
        ignore_https_errors: false,
        throttling: { value: [Object], id: 'default', label: 'Default' },
        'ssl.certificate_authorities': '',
        'ssl.certificate': '',
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        revision: 1,
      },
      references: [],
      managed: false,
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '8.9.0',
    };

    // @ts-expect-error not testing logger functionality
    const result = await refreshInlineZip(normalized, previous, jest.fn());
    expect(typeof (result as BrowserSensitiveSimpleFields)[ConfigKey.SOURCE_PROJECT_CONTENT]).toBe(
      'string'
    );
    // zip is not determinstic, so we can't check the exact value
    expect(
      (result as BrowserSensitiveSimpleFields)[ConfigKey.SOURCE_PROJECT_CONTENT].length
    ).toBeGreaterThan(0);
    // the inline script was edited, and thus the new zip should be different
    expect((result as BrowserSensitiveSimpleFields)[ConfigKey.SOURCE_PROJECT_CONTENT]).not.toEqual(
      (normalized as BrowserSensitiveSimpleFields)[ConfigKey.SOURCE_PROJECT_CONTENT]
    );
  });

  it('does nothing for lightweight monitors', async () => {
    const normalized = {
      type: 'http',
      form_monitor_type: 'http',
      enabled: true,
      alert: { status: { enabled: true }, tls: { enabled: true } },
      schedule: { number: '1', unit: 'm' },
      'service.name': '',
      config_id: '4b14793b-5916-42b4-946f-0eca7e09cf72',
      tags: [],
      timeout: '16',
      name: 'http',
      locations: [{ id: 'dev', label: 'Dev Service', isServiceManaged: true }],
      namespace: 'default',
      origin: 'ui',
      journey_id: '',
      hash: '',
      id: '4b14793b-5916-42b4-946f-0eca7e09cf72',
      params: '',
      max_attempts: 2,
      __ui: { is_tls_enabled: false },
      urls: 'https://www.elastic.co',
      max_redirects: '0',
      'url.port': null,
      password: '',
      proxy_url: '',
      proxy_headers: {},
      'check.response.body.negative': [],
      'check.response.body.positive': [],
      'check.response.json': [],
      'response.include_body': 'on_error',
      'check.response.headers': {},
      'response.include_headers': true,
      'check.response.status': [],
      'check.request.body': { type: 'text', value: '' },
      'check.request.headers': { 'Content-Type': 'text/plain' },
      'check.request.method': 'GET',
      username: '',
      mode: 'any',
      'response.include_body_max_bytes': '1024',
      ipv4: true,
      ipv6: true,
      'ssl.certificate_authorities': '',
      'ssl.certificate': '',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.verification_mode': 'full',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      revision: 4,
    };
    const previous = {
      id: '4b14793b-5916-42b4-946f-0eca7e09cf72',
      type: 'synthetics-monitor',
      namespaces: ['default'],
      migrationVersion: undefined,
      updated_at: '2024-02-09T20:02:56.660Z',
      created_at: '2024-02-09T16:43:19.030Z',
      version: 'WzUzNzcsMV0=',
      attributes: {
        type: 'http',
        form_monitor_type: 'http',
        enabled: true,
        alert: { status: [Object], tls: [Object] },
        schedule: { number: '1', unit: 'm' },
        'service.name': '',
        config_id: '4b14793b-5916-42b4-946f-0eca7e09cf72',
        tags: [],
        timeout: '16',
        name: 'http',
        locations: [[Object]],
        namespace: 'default',
        origin: 'ui',
        journey_id: '',
        hash: '',
        id: '4b14793b-5916-42b4-946f-0eca7e09cf72',
        max_attempts: 2,
        __ui: { is_tls_enabled: false },
        urls: 'https://www.elastic.co/',
        max_redirects: '0',
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
        revision: 3,
      },
      references: [],
      managed: false,
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '8.9.0',
    };

    // @ts-expect-error not testing logger functionality
    const result = await refreshInlineZip(normalized, previous, jest.fn());
    expect((result as any)[ConfigKey.SOURCE_PROJECT_CONTENT]).toBeUndefined();
  });
});

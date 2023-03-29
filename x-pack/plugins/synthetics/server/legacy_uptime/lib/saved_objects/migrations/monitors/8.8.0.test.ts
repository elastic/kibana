/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { migration880 } from './8.8.0';
import { migrationMocks } from '@kbn/core/server/mocks';
import { SourceType, FormMonitorType } from '../../../../../../common/runtime_types';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

const testMonitor = {
  type: 'synthetics-monitor',
  id: '625bedf7-2cbd-4454-aa2c-4e8cc08a9683',
  attributes: {
    type: 'browser',
    form_monitor_type: FormMonitorType.MULTISTEP,
    enabled: true,
    alert: { status: { enabled: true } },
    schedule: { unit: 'm', number: '10' },
    'service.name': '',
    config_id: '625bedf7-2cbd-4454-aa2c-4e8cc08a9683',
    tags: [],
    timeout: null,
    name: 'https://elastic.co',
    locations: [
      {
        id: 'us_central',
        label: 'North America - US Central',
        geo: { lat: 41.25, lon: -95.86 },
        isServiceManaged: true,
      },
    ],
    namespace: 'default',
    origin: SourceType.UI,
    journey_id: '',
    hash: '',
    id: '625bedf7-2cbd-4454-aa2c-4e8cc08a9683',
    project_id: '',
    playwright_options: '',
    __ui: {
      script_source: { is_generated_script: false, file_name: '' },
      is_zip_url_tls_enabled: false,
    },
    'url.port': null,
    'source.zip_url.url': '',
    'source.zip_url.folder': '',
    'source.zip_url.proxy_url': '',
    playwright_text_assertion: '',
    urls: 'https://elastic.co',
    screenshots: 'on',
    'filter_journeys.match': '',
    'filter_journeys.tags': [],
    ignore_https_errors: false,
    'throttling.is_enabled': true,
    'throttling.download_speed': '5',
    'throttling.upload_speed': '3',
    'throttling.latency': '20',
    'throttling.config': '5d/3u/20l',
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    revision: 1,
    secrets:
      '{"params":"","source.inline.script":"step(\'Go to https://elastic.co\', async () => {\\n  await page.goto(\'https://elastic.co\');\\n});","source.project.content":"","synthetics_args":[],"ssl.key":"","ssl.key_passphrase":""}',
  },
  references: [],
  coreMigrationVersion: '8.8.0',
  typeMigrationVersion: '8.6.0',
  updated_at: '2023-03-29T19:28:31.360Z',
  created_at: '2023-03-29T19:28:31.360Z',
};

describe('Monitor migrations v8.7.0 -> v8.8.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(({ migration }) => migration);
  });

  it('removes all top level zip url fields', () => {
    expect(
      Object.keys(testMonitor.attributes).some((key: string) => key.includes('zip_url'))
    ).toEqual(true);
    const actual = migration880(encryptedSavedObjectsSetup)(testMonitor, context);
    expect(actual).toEqual({
      attributes: {
        __ui: {
          script_source: {
            file_name: '',
            is_generated_script: false,
          },
        },
        alert: {
          status: {
            enabled: true,
          },
        },
        config_id: '625bedf7-2cbd-4454-aa2c-4e8cc08a9683',
        enabled: true,
        'filter_journeys.match': '',
        'filter_journeys.tags': [],
        form_monitor_type: 'multistep',
        hash: '',
        id: '625bedf7-2cbd-4454-aa2c-4e8cc08a9683',
        ignore_https_errors: false,
        journey_id: '',
        locations: [
          {
            geo: {
              lat: 41.25,
              lon: -95.86,
            },
            id: 'us_central',
            isServiceManaged: true,
            label: 'North America - US Central',
          },
        ],
        name: 'https://elastic.co',
        namespace: 'default',
        origin: 'ui',
        playwright_options: '',
        playwright_text_assertion: '',
        project_id: '',
        revision: 1,
        schedule: {
          number: '10',
          unit: 'm',
        },
        screenshots: 'on',
        secrets:
          '{"params":"","source.inline.script":"step(\'Go to https://elastic.co\', async () => {\\n  await page.goto(\'https://elastic.co\');\\n});","source.project.content":"","synthetics_args":[],"ssl.key":"","ssl.key_passphrase":""}',
        'service.name': '',
        'ssl.certificate': '',
        'ssl.certificate_authorities': '',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        'ssl.verification_mode': 'full',
        tags: [],
        'throttling.config': '5d/3u/20l',
        'throttling.download_speed': '5',
        'throttling.is_enabled': true,
        'throttling.latency': '20',
        'throttling.upload_speed': '3',
        timeout: null,
        type: 'browser',
        'url.port': null,
        urls: 'https://elastic.co',
      },
      coreMigrationVersion: '8.8.0',
      created_at: '2023-03-29T19:28:31.360Z',
      id: '625bedf7-2cbd-4454-aa2c-4e8cc08a9683',
      references: [],
      type: 'synthetics-monitor',
      typeMigrationVersion: '8.6.0',
      updated_at: '2023-03-29T19:28:31.360Z',
    });
    expect(Object.keys(actual.attributes).some((key: string) => key.includes('zip_url'))).toEqual(
      false
    );
  });

  // it('project monitors - adds custom heartbeat id to id field', () => {
  //   expect(migration880(encryptedSavedObjectsSetup)(monitor850Project, context)).toEqual({
  //     ...monitor850Project,
  //     attributes: {
  //       ...monitor850Project.attributes,
  //       [ConfigKey.MONITOR_QUERY_ID]: monitor850Project.attributes[ConfigKey.CUSTOM_HEARTBEAT_ID],
  //       [ConfigKey.CONFIG_ID]: monitor850Project.id,
  //     },
  //   });
  // });
});

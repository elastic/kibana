/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { migration860 } from './8.6.0';
import { migrationMocks } from '@kbn/core/server/mocks';
import {
  ConfigKey,
  LocationStatus,
  SyntheticsMonitorWithSecrets,
} from '../../../../../../common/runtime_types';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

const monitor850UI = {
  id: 'ac38d021-515b-425c-9f92-e6212dadef9a',
  type: 'synthetics-monitor',
  namespaces: ['default'],
  updated_at: '2022-10-24T14:17:01.875Z',
  version: 'WzgzOCwyQr==',
  attributes: {
    type: 'http',
    form_monitor_type: 'http',
    enabled: true,
    schedule: { number: '3', unit: 'm' },
    'service.name': '',
    config_id: '',
    tags: [],
    timeout: '16',
    name: 'Dominique Clarke',
    locations: [{ id: 'us_central', isServiceManaged: true }],
    namespace: 'default',
    origin: 'ui',
    journey_id: '',
    id: '',
    __ui: { is_tls_enabled: false, is_zip_url_tls_enabled: false },
    urls: 'https://elastic.co',
    max_redirects: '0',
    'url.port': null,
    proxy_url: '',
    'response.include_body': 'on_error',
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.method': 'GET',
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    revision: 1,
    secrets:
      '{"password":"","check.request.body":{"type":"text","value":""},"check.request.headers":{},"check.response.body.negative":[],"check.response.body.positive":[],"check.response.headers":{},"ssl.key":"","ssl.key_passphrase":"","username":""}',
  } as SyntheticsMonitorWithSecrets,
  references: [],
  coreMigrationVersion: '8.5.0',
};

const monitor850Project = {
  id: '3ab5c90f-aa7f-4370-ada2-b559191398f0',
  type: 'synthetics-monitor',
  namespaces: ['default'],
  updated_at: '2022-10-24T15:39:41.510Z',
  version: 'WzE2OSwxXQ==',
  attributes: {
    type: 'browser',
    form_monitor_type: 'multistep',
    enabled: true,
    schedule: { number: '3', unit: 'm' },
    'service.name': '',
    config_id: '',
    tags: [],
    timeout: null,
    name: 'a',
    locations: [
      {
        id: 'us_central',
        label: 'North America - US Central',
        geo: { lat: 41.25, lon: -95.86 },
        url: 'https://us-central.synthetics.elastic.dev',
        isServiceManaged: true,
        status: LocationStatus.GA,
        isInvalid: false,
      },
    ],
    namespace: 'default',
    origin: 'project',
    journey_id: 'a',
    id: '',
    project_id: 'test2',
    playwright_options: '{"ignoreHTTPSErrors":true,"headless":true}',
    __ui: {
      script_source: { is_generated_script: false, file_name: '' },
      is_zip_url_tls_enabled: false,
    },
    'url.port': null,
    'source.zip_url.url': '',
    'source.zip_url.folder': '',
    'source.zip_url.proxy_url': '',
    playwright_text_assertion: '',
    urls: '',
    screenshots: 'on',
    'filter_journeys.match': 'a',
    'filter_journeys.tags': [],
    ignore_https_errors: false,
    'throttling.is_enabled': true,
    'throttling.download_speed': '10',
    'throttling.upload_speed': '5',
    'throttling.latency': '10',
    'throttling.config': '10d/5u/10l',
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    original_space: 'default',
    custom_heartbeat_id: 'a-test2-default',
    revision: 1,
    secrets:
      '{"params":"{\\"url\\":\\"https://elastic.github.io/synthetics-demo/\\"}","source.inline.script":"","source.project.content":"UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAXAAAAam91cm5leXMvb25lLmpvdXJuZXkudHNVkL1uwzAMhHc/BeFJAQyrLdAlQYouXbp3KjqwMhMrlUVVohMYgd+9in+AdCHED6c7kloDpkSy1R+JYtINd9bb356Mw/hDuqGzToOXlsSapIWSPOkT99HTkDR7qpemllTYLnAUuMLCKkhCoYKOvRWOMMIhcgflKzlM2e/OudwVZ4xgIqHQ+/wd9qA8drSB/QtcC1h96j6RuvUA0kYWcdYftzATgIYv3jE2W3h8qBbWh5k8r8DlGG+Gm2YiY67jZpfrMvuUXIG6QsBjfgSM2KWsWYeBaTlVOuy9aQFDcNagWPZllW86eAPqTgyAF7QyudVHFlazY91HN+Wu+bc67orPErNP+V1+1QeOb2hapXDy+3ejzLL+D1BLBwgqc7lrFgEAAMYBAABQSwECLQMUAAgACAAAACEAKnO5axYBAADGAQAAFwAAAAAAAAAAACAApIEAAAAAam91cm5leXMvb25lLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBFAAAAWwEAAAAA","source.zip_url.username":"","source.zip_url.password":"","synthetics_args":[],"ssl.key":"","ssl.key_passphrase":""}',
  } as SyntheticsMonitorWithSecrets,
  references: [],
  coreMigrationVersion: '8.5.0',
};

describe('Case migrations v8.5.0 -> v8.6.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(({ migration }) => migration);
  });

  it('UI monitors - adds saved object id to the id field', () => {
    expect(migration860(encryptedSavedObjectsSetup)(monitor850UI, context)).toEqual({
      ...monitor850UI,
      attributes: {
        ...monitor850UI.attributes,
        [ConfigKey.MONITOR_QUERY_ID]: monitor850UI.id,
        [ConfigKey.CONFIG_ID]: monitor850UI.id,
      },
    });
  });

  it('project monitors - adds custom heartbeat id to id field', () => {
    expect(migration860(encryptedSavedObjectsSetup)(monitor850Project, context)).toEqual({
      ...monitor850Project,
      attributes: {
        ...monitor850Project.attributes,
        [ConfigKey.MONITOR_QUERY_ID]: monitor850Project.attributes[ConfigKey.CUSTOM_HEARTBEAT_ID],
        [ConfigKey.CONFIG_ID]: monitor850Project.id,
      },
    });
  });

  it('handles empty custom heartbeat id string', () => {
    const attributes = { ...monitor850UI.attributes, [ConfigKey.CUSTOM_HEARTBEAT_ID]: '' };
    expect(
      migration860(encryptedSavedObjectsSetup)(
        {
          ...monitor850UI,
          attributes,
        },
        context
      )
    ).toEqual({
      ...monitor850UI,
      attributes: {
        ...attributes,
        [ConfigKey.MONITOR_QUERY_ID]: monitor850UI.id,
        [ConfigKey.CONFIG_ID]: monitor850UI.id,
      },
    });
  });

  it('handles null custom heartbeat id string', () => {
    const attributes = { ...monitor850UI.attributes, [ConfigKey.CUSTOM_HEARTBEAT_ID]: null };

    expect(
      migration860(encryptedSavedObjectsSetup)(
        {
          ...monitor850UI,
          // @ts-ignore
          attributes,
        },
        context
      )
    ).toEqual({
      ...monitor850UI,
      attributes: {
        ...attributes,
        [ConfigKey.MONITOR_QUERY_ID]: monitor850UI.id,
        [ConfigKey.CONFIG_ID]: monitor850UI.id,
      },
    });
  });

  it('handles undefined custom heartbeat id string', () => {
    const attributes = { ...monitor850UI.attributes, [ConfigKey.CUSTOM_HEARTBEAT_ID]: undefined };
    expect(
      migration860(encryptedSavedObjectsSetup)(
        {
          ...monitor850UI,
          attributes,
        },
        context
      )
    ).toEqual({
      ...monitor850UI,
      attributes: {
        ...attributes,
        [ConfigKey.MONITOR_QUERY_ID]: monitor850UI.id,
        [ConfigKey.CONFIG_ID]: monitor850UI.id,
      },
    });
  });
});

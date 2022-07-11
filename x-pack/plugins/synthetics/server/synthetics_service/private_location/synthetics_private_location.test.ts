/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testMonitorPolicy } from './test_policy';
import { formatSyntheticsPolicy } from '../../../common/formatters/format_synthetics_policy';
import { DataStream, MonitorFields, ScheduleUnit, SourceType } from '../../../common/runtime_types';

describe('SyntheticsPrivateLocation', () => {
  it('formats monitors stream properly', () => {
    const test = formatSyntheticsPolicy(testMonitorPolicy, DataStream.BROWSER, dummyBrowserConfig);

    expect(test.formattedPolicy.inputs[3].streams[1]).toStrictEqual({
      data_stream: {
        dataset: 'browser',
        type: 'synthetics',
      },
      enabled: true,
      vars: {
        __ui: {
          type: 'yaml',
          value:
            '{"script_source":{"is_generated_script":false,"file_name":""},"is_zip_url_tls_enabled":false,"is_tls_enabled":true}',
        },
        config_id: {
          type: 'text',
          value: '75cdd125-5b62-4459-870c-46f59bf37e89',
        },
        enabled: {
          type: 'bool',
          value: true,
        },
        'filter_journeys.match': {
          type: 'text',
          value: null,
        },
        'filter_journeys.tags': {
          type: 'yaml',
          value: null,
        },
        ignore_https_errors: {
          type: 'bool',
          value: false,
        },
        location_name: {
          type: 'text',
          value: 'test location',
        },
        name: {
          type: 'text',
          value: 'Browser monitor',
        },
        params: {
          type: 'yaml',
          value: '',
        },
        run_once: {
          type: 'bool',
          value: false,
        },
        schedule: {
          type: 'text',
          value: '"@every 10m"',
        },
        screenshots: {
          type: 'text',
          value: 'on',
        },
        'service.name': {
          type: 'text',
          value: '',
        },
        'source.inline.script': {
          type: 'yaml',
          value:
            "\"step('Go to https://www.elastic.co/', async () => {\\n  await page.goto('https://www.elastic.co/');\\n});\"",
        },
        'source.zip_url.folder': {
          type: 'text',
          value: '',
        },
        'source.zip_url.password': {
          type: 'password',
          value: '',
        },
        'source.zip_url.proxy_url': {
          type: 'text',
          value: '',
        },
        'source.zip_url.ssl.certificate': {
          type: 'yaml',
        },
        'source.zip_url.ssl.certificate_authorities': {
          type: 'yaml',
        },
        'source.zip_url.ssl.key': {
          type: 'yaml',
        },
        'source.zip_url.ssl.key_passphrase': {
          type: 'text',
        },
        'source.zip_url.ssl.supported_protocols': {
          type: 'yaml',
        },
        'source.zip_url.ssl.verification_mode': {
          type: 'text',
        },
        'source.zip_url.url': {
          type: 'text',
          value: '',
        },
        'source.zip_url.username': {
          type: 'text',
          value: '',
        },
        synthetics_args: {
          type: 'text',
          value: null,
        },
        tags: {
          type: 'yaml',
          value: null,
        },
        'throttling.config': {
          type: 'text',
          value: '5d/3u/20l',
        },
        timeout: {
          type: 'text',
          value: null,
        },
        type: {
          type: 'text',
          value: 'browser',
        },
      },
    });
  });
});

const dummyBrowserConfig: Partial<MonitorFields> & {
  id: string;
  fields: Record<string, string | boolean>;
  fields_under_root: boolean;
} = {
  type: DataStream.BROWSER,
  enabled: true,
  schedule: { unit: ScheduleUnit.MINUTES, number: '10' },
  'service.name': '',
  tags: [],
  timeout: null,
  name: 'Browser monitor',
  locations: [{ isServiceManaged: false, id: '1' }],
  namespace: 'default',
  origin: SourceType.UI,
  journey_id: '',
  project_id: '',
  playwright_options: '',
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_zip_url_tls_enabled: false,
    is_tls_enabled: true,
  },
  params: '',
  'url.port': 443,
  'source.inline.script':
    "step('Go to https://www.elastic.co/', async () => {\n  await page.goto('https://www.elastic.co/');\n});",
  'source.project.content': '',
  'source.zip_url.url': '',
  'source.zip_url.username': '',
  'source.zip_url.password': '',
  'source.zip_url.folder': '',
  'source.zip_url.proxy_url': '',
  urls: 'https://www.elastic.co/',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  'throttling.is_enabled': true,
  'throttling.download_speed': '5',
  'throttling.upload_speed': '3',
  'throttling.latency': '20',
  'throttling.config': '5d/3u/20l',
  id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  config_id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  fields: { config_id: '75cdd125-5b62-4459-870c-46f59bf37e89', run_once: true },
  fields_under_root: true,
  max_redirects: '0',
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMonitorConfig } from './format_configs';
import {
  ConfigKey,
  DataStream,
  Mode,
  MonitorFields,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
} from '../../../../common/runtime_types/monitor_management';

describe('formatMonitorConfig', () => {
  const testHTTPConfig: Partial<MonitorFields> = {
    type: 'http' as DataStream,
    enabled: true,
    schedule: { number: '3', unit: 'm' as ScheduleUnit },
    'service.name': '',
    tags: [],
    timeout: '16',
    name: 'Test',
    locations: [],
    __ui: { is_tls_enabled: false, is_zip_url_tls_enabled: false },
    urls: 'https://www.google.com',
    max_redirects: '0',
    password: '3z9SBOQWW5F0UrdqLVFqlF6z',
    proxy_url: '',
    'check.response.body.negative': [],
    'check.response.body.positive': [],
    'response.include_body': 'on_error' as ResponseBodyIndexPolicy,
    'check.response.headers': {},
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.body': { type: 'text' as Mode, value: '' },
    'check.request.headers': {},
    'check.request.method': 'GET',
    username: '',
  };

  it.skip('sets https keys properly', () => {
    const yamlConfig = formatMonitorConfig(
      Object.keys(testHTTPConfig) as ConfigKey[],
      testHTTPConfig
    );

    expect(yamlConfig).toEqual({
      'check.request.method': 'GET',
      enabled: true,
      locations: [],
      max_redirects: '0',
      name: 'Test',
      password: '3z9SBOQWW5F0UrdqLVFqlF6z',
      'response.include_body': 'on_error',
      'response.include_headers': true,
      schedule: '@every 3m',
      timeout: '16s',
      type: 'http',
      urls: 'https://www.google.com',
    });
  });

  const testBrowserConfig = {
    type: 'browser',
    enabled: true,
    schedule: { number: '3', unit: 'm' },
    'service.name': '',
    tags: [],
    timeout: '16',
    name: 'Test',
    locations: [],
    __ui: {
      script_source: { is_generated_script: false, file_name: '' },
      is_zip_url_tls_enabled: false,
      is_tls_enabled: false,
    },
    'source.zip_url.url': '',
    'source.zip_url.username': '',
    'source.zip_url.password': '',
    'source.zip_url.folder': '',
    'source.zip_url.proxy_url': '',
    'source.inline.script':
      "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
    params: '',
    screenshots: 'on',
    synthetics_args: [],
    'filter_journeys.match': '',
    'filter_journeys.tags': ['dev'],
    ignore_https_errors: false,
    'throttling.is_enabled': true,
    'throttling.download_speed': '5',
    'throttling.upload_speed': '3',
    'throttling.latency': '20',
    'throttling.config': '5d/3u/20l',
  } as Partial<MonitorFields>;

  it('sets browser keys properly', () => {
    const yamlConfig = formatMonitorConfig(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig
    );

    expect(yamlConfig).toEqual({
      enabled: true,
      'filter_journeys.tags': ['dev'],
      locations: [],
      name: 'Test',
      schedule: '@every 3m',
      screenshots: 'on',
      'source.inline.script':
        "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
      throttling: '5d/3u/20l',
      timeout: '16s',
      type: 'browser',
    });

    testBrowserConfig['throttling.is_enabled'] = false;
    testBrowserConfig['filter_journeys.tags'] = [];

    expect(
      formatMonitorConfig(Object.keys(testBrowserConfig) as ConfigKey[], testBrowserConfig)
    ).toEqual({
      enabled: true,
      locations: [],
      name: 'Test',
      schedule: '@every 3m',
      screenshots: 'on',
      'source.inline.script':
        "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
      throttling: false,
      timeout: '16s',
      type: 'browser',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { FormattedValue } from './common';
import { formatMonitorConfig, formatHeartbeatRequest } from './format_configs';
import {
  ConfigKey,
  DataStream,
  Mode,
  MonitorFields,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  SyntheticsMonitor,
} from '../../../common/runtime_types';

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

const testBrowserConfig: Partial<MonitorFields> = {
  type: DataStream.BROWSER,
  enabled: true,
  schedule: { number: '3', unit: ScheduleUnit.MINUTES },
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
  params: '{"a":"param"}',
  playwright_options: '{"playwright":"option"}',
  screenshots: 'on',
  synthetics_args: ['--hasTouch true'],
  'filter_journeys.match': '',
  'filter_journeys.tags': ['dev'],
  ignore_https_errors: false,
  'throttling.is_enabled': true,
  'throttling.download_speed': '5',
  'throttling.upload_speed': '3',
  'throttling.latency': '20',
  'throttling.config': '5d/3u/20l',
  project_id: 'test-project',
};

describe('formatMonitorConfig', () => {
  describe('http fields', () => {
    it('sets https keys properly', () => {
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
  });

  describe('browser fields', () => {
    let formattedBrowserConfig: Record<string, FormattedValue>;

    beforeEach(() => {
      formattedBrowserConfig = {
        enabled: true,
        'filter_journeys.tags': ['dev'],
        ignore_https_errors: false,
        name: 'Test',
        locations: [],
        schedule: '@every 3m',
        screenshots: 'on',
        'source.inline.script':
          "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
        throttling: {
          download: 5,
          latency: 20,
          upload: 3,
        },
        timeout: '16s',
        type: 'browser',
        synthetics_args: ['--hasTouch true'],
        params: {
          a: 'param',
        },
        playwright_options: {
          playwright: 'option',
        },
      };
    });

    it('sets browser keys properly', () => {
      const yamlConfig = formatMonitorConfig(
        Object.keys(testBrowserConfig) as ConfigKey[],
        testBrowserConfig
      );

      expect(yamlConfig).toEqual(formattedBrowserConfig);
    });

    it('does not set empty strings or empty objects for params and playwright options', () => {
      const yamlConfig = formatMonitorConfig(Object.keys(testBrowserConfig) as ConfigKey[], {
        ...testBrowserConfig,
        playwright_options: '{}',
        params: '',
      });

      expect(yamlConfig).toEqual(omit(formattedBrowserConfig, ['params', 'playwright_options']));
    });

    it('excludes UI fields', () => {
      testBrowserConfig['throttling.is_enabled'] = false;
      testBrowserConfig['throttling.upload_speed'] = '3';

      const formattedConfig = formatMonitorConfig(
        Object.keys(testBrowserConfig) as ConfigKey[],
        testBrowserConfig
      );

      const expected = {
        ...formattedConfig,
        throttling: false,
        'throttling.is_enabled': undefined,
        'throttling.upload_speed': undefined,
      };

      expect(formattedConfig).toEqual(expected);
    });

    it('excludes empty array values', () => {
      testBrowserConfig['filter_journeys.tags'] = [];

      const formattedConfig = formatMonitorConfig(
        Object.keys(testBrowserConfig) as ConfigKey[],
        testBrowserConfig
      );

      const expected = {
        ...formattedConfig,
        'filter_journeys.tags': undefined,
      };

      expect(formattedConfig).toEqual(expected);
    });

    it('does not exclude "false" fields', () => {
      testBrowserConfig.enabled = false;

      const formattedConfig = formatMonitorConfig(
        Object.keys(testBrowserConfig) as ConfigKey[],
        testBrowserConfig
      );

      const expected = { ...formattedConfig, enabled: false };

      expect(formattedConfig).toEqual(expected);
    });
  });
});

describe('formatHeartbeatRequest', () => {
  it('uses heartbeat id', () => {
    const monitorId = 'test-monitor-id';
    const heartbeatId = 'test-custom-heartbeat-id';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      monitorId,
      heartbeatId,
      params: {},
    });
    expect(actual).toEqual({
      ...testBrowserConfig,
      id: heartbeatId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: undefined,
      },
      fields_under_root: true,
    });
  });

  it('uses monitor id when custom heartbeat id is not defined', () => {
    const monitorId = 'test-monitor-id';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      monitorId,
      heartbeatId: monitorId,
      params: {},
    });
    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: undefined,
      },
      fields_under_root: true,
    });
  });

  it('sets project fields as null when project id is not defined', () => {
    const monitorId = 'test-monitor-id';
    const monitor = { ...testBrowserConfig, project_id: undefined } as SyntheticsMonitor;
    const actual = formatHeartbeatRequest({
      monitor,
      monitorId,
      heartbeatId: monitorId,
      params: {},
    });

    expect(actual).toEqual({
      ...monitor,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': undefined,
        'monitor.project.id': undefined,
        run_once: undefined,
        test_run_id: undefined,
      },
      fields_under_root: true,
    });
  });

  it('sets project fields as null when project id is empty', () => {
    const monitorId = 'test-monitor-id';
    const monitor = { ...testBrowserConfig, project_id: '' } as SyntheticsMonitor;
    const actual = formatHeartbeatRequest({
      monitor,
      monitorId,
      heartbeatId: monitorId,
      params: {},
    });

    expect(actual).toEqual({
      ...monitor,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': undefined,
        'monitor.project.id': undefined,
        run_once: undefined,
        test_run_id: undefined,
      },
      fields_under_root: true,
    });
  });

  it('supports run once', () => {
    const monitorId = 'test-monitor-id';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      monitorId,
      runOnce: true,
      heartbeatId: monitorId,
      params: {},
    });

    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: true,
        test_run_id: undefined,
      },
      fields_under_root: true,
    });
  });

  it('supports test_run_id', () => {
    const monitorId = 'test-monitor-id';
    const testRunId = 'beep';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      monitorId,
      testRunId,
      heartbeatId: monitorId,
      params: {},
    });

    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: testRunId,
      },
      fields_under_root: true,
    });
  });

  it('supports empty params', () => {
    const monitorId = 'test-monitor-id';
    const testRunId = 'beep';
    const actual = formatHeartbeatRequest({
      monitor: { ...testBrowserConfig, params: '' } as SyntheticsMonitor,
      monitorId,
      testRunId,
      heartbeatId: monitorId,
      params: {},
    });

    expect(actual).toEqual({
      ...testBrowserConfig,
      params: '',
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: testRunId,
      },
      fields_under_root: true,
    });
  });
});

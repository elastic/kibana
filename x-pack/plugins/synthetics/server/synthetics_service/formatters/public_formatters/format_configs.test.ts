/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { FormattedValue } from './common';
import {
  formatMonitorConfigFields,
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from './format_configs';

import { loggerMock } from '@kbn/logging-mocks';
import {
  ConfigKey,
  MonitorTypeEnum,
  CodeEditorMode,
  MonitorFields,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  SyntheticsMonitor,
  VerificationMode,
} from '../../../../common/runtime_types';

const testHTTPConfig: Partial<MonitorFields> = {
  type: 'http' as MonitorTypeEnum,
  enabled: true,
  schedule: { number: '3', unit: 'm' as ScheduleUnit },
  'service.name': '',
  tags: [],
  timeout: '16',
  name: 'Test',
  locations: [],
  __ui: { is_tls_enabled: false },
  urls: 'https://www.google.com',
  max_redirects: '0',
  'url.port': 900,
  password: '3z9SBOQWW5F0UrdqLVFqlF6z',
  proxy_url: '${proxyUrl}',
  'check.response.body.negative': [],
  'check.response.body.positive': [],
  'check.response.json': [
    {
      description: 'test description',
      expression: 'foo.bar == "myValue"',
    },
  ],
  'response.include_body': 'on_error' as ResponseBodyIndexPolicy,
  'check.response.headers': {
    'test-header': 'test-value',
  },
  'response.include_headers': true,
  'check.response.status': [],
  'check.request.body': { type: 'text' as CodeEditorMode, value: '' },
  'check.request.headers': {},
  'check.request.method': 'GET',
  'ssl.verification_mode': VerificationMode.NONE,
  username: 'test-username',
  params: '{"proxyUrl":"https://www.google.com"}',
};

const testBrowserConfig: Partial<MonitorFields> = {
  type: MonitorTypeEnum.BROWSER,
  enabled: true,
  schedule: { number: '3', unit: ScheduleUnit.MINUTES },
  'service.name': 'APM Service',
  tags: [],
  timeout: '16',
  name: 'Test',
  locations: [],
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_tls_enabled: false,
  },
  'source.inline.script':
    "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
  params: '{"a":"param"}',
  playwright_options: '{"playwright":"option"}',
  screenshots: 'on',
  synthetics_args: ['--hasTouch true'],
  'filter_journeys.match': '',
  'filter_journeys.tags': ['dev'],
  ignore_https_errors: false,
  throttling: {
    value: {
      download: '5',
      latency: '20',
      upload: '3',
    },
    id: 'default',
    label: 'default',
  },
  project_id: 'test-project',
};

describe('formatMonitorConfig', () => {
  const logger = loggerMock.create();

  describe('http fields', () => {
    it('sets https keys properly', () => {
      const yamlConfig = formatMonitorConfigFields(
        Object.keys(testHTTPConfig) as ConfigKey[],
        testHTTPConfig,
        logger,
        { proxyUrl: 'https://www.google.com' }
      );

      expect(yamlConfig).toEqual({
        'check.request.method': 'GET',
        'check.response.headers': {
          'test-header': 'test-value',
        },
        'check.response.json': [
          {
            description: 'test description',
            expression: 'foo.bar == "myValue"',
          },
        ],
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
        proxy_url: 'https://www.google.com',
        username: 'test-username',
        'url.port': 900,
      });
    });

    it.each([true, false])(
      'omits ssl fields when tls is disabled and includes ssl fields when enabled',
      (isTLSEnabled) => {
        const yamlConfig = formatMonitorConfigFields(
          Object.keys(testHTTPConfig) as ConfigKey[],
          {
            ...testHTTPConfig,
            [ConfigKey.METADATA]: { is_tls_enabled: isTLSEnabled },
          },
          logger,
          { proxyUrl: 'https://www.google.com' }
        );

        expect(yamlConfig).toEqual({
          'check.request.method': 'GET',
          'check.response.headers': {
            'test-header': 'test-value',
          },
          'check.response.json': [
            {
              description: 'test description',
              expression: 'foo.bar == "myValue"',
            },
          ],
          enabled: true,
          locations: [],
          max_redirects: '0',
          name: 'Test',
          username: 'test-username',
          password: '3z9SBOQWW5F0UrdqLVFqlF6z',
          proxy_url: 'https://www.google.com',
          'response.include_body': 'on_error',
          'response.include_headers': true,
          schedule: '@every 3m',
          timeout: '16s',
          type: 'http',
          'url.port': 900,
          urls: 'https://www.google.com',
          ...(isTLSEnabled ? { 'ssl.verification_mode': 'none' } : {}),
        });
      }
    );
  });
});

describe('browser fields', () => {
  let formattedBrowserConfig: Record<string, FormattedValue>;
  const logger = loggerMock.create();

  beforeEach(() => {
    formattedBrowserConfig = {
      enabled: true,
      'filter_journeys.tags': ['dev'],
      ignore_https_errors: false,
      name: 'Test',
      locations: [],
      schedule: '@every 3m',
      screenshots: 'on',
      'service.name': 'APM Service',
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
    const yamlConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' }
    );

    expect(yamlConfig).toEqual(formattedBrowserConfig);
  });

  it('does not set empty strings or empty objects for params and playwright options', () => {
    const yamlConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      {
        ...testBrowserConfig,
        playwright_options: '{}',
        params: '',
      },
      logger,
      { proxyUrl: 'https://www.google.com' }
    );

    expect(yamlConfig).toEqual(omit(formattedBrowserConfig, ['params', 'playwright_options']));
  });

  it('excludes UI fields', () => {
    const formattedConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      {
        ...testBrowserConfig,
        throttling: {
          value: null,
          label: 'no-throttling',
          id: 'no-throttling',
        },
      },
      logger,
      { proxyUrl: 'https://www.google.com' }
    );

    const expected = {
      ...formattedConfig,
      throttling: false,
    };

    expect(formattedConfig).toEqual(expected);
  });

  it('excludes empty array values', () => {
    testBrowserConfig['filter_journeys.tags'] = [];

    const formattedConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' }
    );

    const expected = {
      ...formattedConfig,
      'filter_journeys.tags': undefined,
    };

    expect(formattedConfig).toEqual(expected);
  });

  it('does not exclude "false" fields', () => {
    testBrowserConfig.enabled = false;

    const formattedConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' }
    );

    const expected = { ...formattedConfig, enabled: false };

    expect(formattedConfig).toEqual(expected);
  });
});

describe('formatHeartbeatRequest', () => {
  it('uses heartbeat id', async () => {
    const monitorId = 'test-monitor-id';
    const heartbeatId = 'test-custom-heartbeat-id';
    const actual = await formatHeartbeatRequest(
      {
        monitor: testBrowserConfig as SyntheticsMonitor,
        configId: monitorId,
        heartbeatId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn(),
      '{"a":"param"}'
    );
    expect(actual).toEqual({
      ...testBrowserConfig,
      id: heartbeatId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: undefined,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('uses monitor id when custom heartbeat id is not defined', async () => {
    const monitorId = 'test-monitor-id';
    const actual = await formatHeartbeatRequest(
      {
        monitor: testBrowserConfig as SyntheticsMonitor,
        configId: monitorId,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn(),
      JSON.stringify({ key: 'value' })
    );
    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: undefined,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
      params: '{"key":"value"}',
    });
  });

  it('sets project fields as null when project id is not defined', async () => {
    const monitorId = 'test-monitor-id';
    const monitor = { ...testBrowserConfig, project_id: undefined } as SyntheticsMonitor;
    const actual = await formatHeartbeatRequest(
      {
        monitor,
        configId: monitorId,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn()
    );
    expect(actual).toEqual({
      ...monitor,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': undefined,
        'monitor.project.id': undefined,
        run_once: undefined,
        test_run_id: undefined,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('sets project fields as null when project id is empty', async () => {
    const monitorId = 'test-monitor-id';
    const monitor = { ...testBrowserConfig, project_id: '' } as SyntheticsMonitor;
    const actual = await formatHeartbeatRequest(
      {
        monitor,
        configId: monitorId,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn()
    );

    expect(actual).toEqual({
      ...monitor,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': undefined,
        'monitor.project.id': undefined,
        run_once: undefined,
        test_run_id: undefined,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('supports run once', async () => {
    const monitorId = 'test-monitor-id';
    const actual = await formatHeartbeatRequest(
      {
        monitor: testBrowserConfig as SyntheticsMonitor,
        configId: monitorId,
        runOnce: true,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn()
    );

    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: true,
        test_run_id: undefined,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('supports test_run_id', async () => {
    const monitorId = 'test-monitor-id';
    const testRunId = 'beep';
    const actual = await formatHeartbeatRequest(
      {
        monitor: testBrowserConfig as SyntheticsMonitor,
        configId: monitorId,
        testRunId,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn()
    );

    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: testRunId,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('supports empty params', async () => {
    const monitorId = 'test-monitor-id';
    const testRunId = 'beep';
    const actual = await formatHeartbeatRequest(
      {
        monitor: { ...testBrowserConfig, params: '' } as SyntheticsMonitor,
        configId: monitorId,
        testRunId,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      // @ts-expect-error not checking logger functionality
      jest.fn()
    );

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
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });
});

describe('mixParamsWithGlobalParams', () => {
  it('mixes global params with local', () => {
    const actual = mixParamsWithGlobalParams(
      {
        username: 'test-user',
        password: 'test-password',
        url: 'test-url',
      },
      { params: '{"a":"param"}' } as any
    );
    expect(actual).toEqual({
      params: {
        a: 'param',
        password: 'test-password',
        url: 'test-url',
        username: 'test-user',
      },
      str: '{"username":"test-user","password":"test-password","url":"test-url","a":"param"}',
    });
  });

  it('local params gets preference', () => {
    const actual = mixParamsWithGlobalParams(
      {
        username: 'test-user',
        password: 'test-password',
        url: 'test-url',
      },
      { params: '{"username":"superpower-user"}' } as any
    );
    expect(actual).toEqual({
      params: {
        password: 'test-password',
        url: 'test-url',
        username: 'superpower-user',
      },
      str: '{"username":"superpower-user","password":"test-password","url":"test-url"}',
    });
  });
});

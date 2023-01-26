/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

jest.mock('axios', () => jest.fn());

import { Logger } from '@kbn/core/server';
import { ServiceAPIClient } from './service_api_client';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { ServiceConfig } from '../../common/config';
import axios from 'axios';
import { LocationStatus, PublicLocations } from '../../common/runtime_types';

jest.mock('@kbn/server-http-tools', () => ({
  SslConfig: jest.fn().mockImplementation(({ certificate, key }) => ({ certificate, key })),
}));

describe('getHttpsAgent', () => {
  it('does not use certs if basic auth is set', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { username: 'u', password: 'p' },
      { isDev: true } as UptimeServerSetup
    );
    const { options: result } = apiClient.getHttpsAgent('https://localhost:10001');
    expect(result).not.toHaveProperty('cert');
    expect(result).not.toHaveProperty('key');
  });

  it('rejectUnauthorised is true for requests out of localhost even in dev', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: true } as UptimeServerSetup
    );

    const { options: result } = apiClient.getHttpsAgent('https://example.com');
    expect(result).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
  });

  it('use rejectUnauthorised as true out of dev for localhost', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: false } as UptimeServerSetup
    );

    const { options: result } = apiClient.getHttpsAgent('https://localhost:10001');
    expect(result).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
  });

  it('uses certs when defined', () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: false } as UptimeServerSetup
    );

    const { options: result } = apiClient.getHttpsAgent('https://localhost:10001');
    expect(result).toEqual(expect.objectContaining({ cert: 'crt', key: 'k' }));
  });
});

describe('checkAccountAccessStatus', () => {
  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it('includes a header with the kibana version', async () => {
    const apiClient = new ServiceAPIClient(
      jest.fn() as unknown as Logger,
      { tls: { certificate: 'crt', key: 'k' } } as ServiceConfig,
      { isDev: false, stackVersion: '8.4' } as UptimeServerSetup
    );

    apiClient.locations = [
      {
        id: 'test-location',
        url: 'http://localhost',
        label: 'Test location',
        isServiceManaged: true,
      },
    ];

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {},
      data: { allowed: true, signupUrl: 'http://localhost:666/example' },
    });

    const result = await apiClient.checkAccountAccessStatus();

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'x-kibana-version': '8.4' } })
    );

    expect(result).toEqual({ allowed: true, signupUrl: 'http://localhost:666/example' });
  });
});

describe('callAPI', () => {
  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  const logger = loggerMock.create();

  const config = {
    username: 'dev',
    password: '12345',
    manifestUrl: 'http://localhost:8080/api/manifest',
  };

  it('it calls service endpoint when adding monitors with basic auth', async () => {
    const axiosSpy = (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {},
      data: { allowed: true, signupUrl: 'http://localhost:666/example' },
    });

    const apiClient = new ServiceAPIClient(logger, config, {
      isDev: true,
      stackVersion: '8.7.0',
    } as UptimeServerSetup);

    const spy = jest.spyOn(apiClient, 'callServiceEndpoint');

    apiClient.locations = testLocations;

    const output = { hosts: ['https://localhost:9200'], api_key: '12345' };

    await apiClient.callAPI('POST', {
      monitors: testMonitors,
      output,
    });

    expect(spy).toHaveBeenCalledTimes(3);
    const devUrl = 'https://service.dev';

    expect(spy).toHaveBeenNthCalledWith(
      1,
      {
        isEdit: undefined,
        runOnce: undefined,
        monitors: testMonitors.filter((monitor: any) =>
          monitor.locations.some((loc: any) => loc.id === 'us_central')
        ),
        output,
      },
      'POST',
      devUrl
    );

    expect(spy).toHaveBeenNthCalledWith(
      2,
      {
        isEdit: undefined,
        runOnce: undefined,
        monitors: testMonitors.filter((monitor: any) =>
          monitor.locations.some((loc: any) => loc.id === 'us_central_qa')
        ),
        output,
      },
      'POST',
      'https://qa.service.elstc.co'
    );

    expect(spy).toHaveBeenNthCalledWith(
      3,
      {
        isEdit: undefined,
        runOnce: undefined,
        monitors: testMonitors.filter((monitor: any) =>
          monitor.locations.some((loc: any) => loc.id === 'us_central_staging')
        ),
        output,
      },
      'POST',
      'https://qa.service.stg.co'
    );

    expect(axiosSpy).toHaveBeenCalledTimes(3);
    expect(axiosSpy).toHaveBeenNthCalledWith(1, {
      data: { monitors: request1, is_edit: undefined, output, stack_version: '8.7.0' },
      headers: {
        Authorization: 'Basic ZGV2OjEyMzQ1',
        'x-kibana-version': '8.7.0',
      },
      httpsAgent: expect.objectContaining({
        options: { noDelay: true, rejectUnauthorized: true, path: null },
      }),
      method: 'POST',
      url: 'https://service.dev/monitors',
    });

    expect(axiosSpy).toHaveBeenNthCalledWith(2, {
      data: { monitors: request2, is_edit: undefined, output, stack_version: '8.7.0' },
      headers: {
        Authorization: 'Basic ZGV2OjEyMzQ1',
        'x-kibana-version': '8.7.0',
      },
      httpsAgent: expect.objectContaining({
        options: { noDelay: true, rejectUnauthorized: true, path: null },
      }),
      method: 'POST',
      url: 'https://qa.service.elstc.co/monitors',
    });

    expect(axiosSpy).toHaveBeenNthCalledWith(3, {
      data: { monitors: request3, is_edit: undefined, output, stack_version: '8.7.0' },
      headers: {
        Authorization: 'Basic ZGV2OjEyMzQ1',
        'x-kibana-version': '8.7.0',
      },
      httpsAgent: expect.objectContaining({
        options: { noDelay: true, rejectUnauthorized: true, path: null },
      }),
      method: 'POST',
      url: 'https://qa.service.stg.co/monitors',
    });

    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(logger.debug).toHaveBeenCalledTimes(6);
    expect(logger.debug).toHaveBeenNthCalledWith(1, {
      allowed: true,
      signupUrl: 'http://localhost:666/example',
    });
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      'Successfully called service location https://service.dev with method POST with 4 monitors '
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      4,
      'Successfully called service location https://qa.service.elstc.co with method POST with 4 monitors '
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      6,
      'Successfully called service location https://qa.service.stg.co with method POST with 1 monitors '
    );
  });

  it('it calls service endpoint when adding monitors with tls auth', async () => {
    const axiosSpy = (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {},
      data: { allowed: true, signupUrl: 'http://localhost:666/example' },
    });

    const apiClient = new ServiceAPIClient(
      logger,
      {
        manifestUrl: 'http://localhost:8080/api/manifest',
        tls: {
          certificate: 'test-certificate',
          key: 'test-key',
        } as any,
      },
      {
        isDev: true,
        stackVersion: '8.7.0',
      } as UptimeServerSetup
    );

    apiClient.locations = testLocations;

    const output = { hosts: ['https://localhost:9200'], api_key: '12345' };

    await apiClient.callAPI('POST', {
      monitors: testMonitors,
      output,
    });

    expect(axiosSpy).toHaveBeenNthCalledWith(1, {
      data: { monitors: request1, is_edit: undefined, output, stack_version: '8.7.0' },
      headers: {
        'x-kibana-version': '8.7.0',
      },
      httpsAgent: expect.objectContaining({
        options: {
          rejectUnauthorized: true,
          noDelay: true,
          path: null,
          cert: 'test-certificate',
          key: 'test-key',
        },
      }),
      method: 'POST',
      url: 'https://service.dev/monitors',
    });
  });
});

const testLocations: PublicLocations = [
  {
    id: 'us_central',
    label: 'North America - US Central',
    geo: { lat: 41.25, lon: -95.86 },
    url: 'https://service.dev',
    isServiceManaged: true,
    status: LocationStatus.BETA,
    isInvalid: false,
  },
  {
    id: 'us_central_qa',
    label: 'US Central QA',
    geo: { lat: 41.25, lon: -95.86 },
    url: 'https://qa.service.elstc.co',
    isServiceManaged: true,
    status: LocationStatus.BETA,
    isInvalid: false,
  },
  {
    id: 'us_central_staging',
    label: 'US Central Staging',
    geo: { lat: 41.25, lon: -95.86 },
    url: 'https://qa.service.stg.co',
    isServiceManaged: true,
    status: LocationStatus.BETA,
    isInvalid: false,
  },
];

const request1 = [
  {
    type: 'browser',
    id: '9d7be1fc-6732-4913-992f-a9e406903659',
    schedule: '@every 10m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'browser', type: 'synthetics' },
        type: 'browser',
        enabled: true,
        schedule: '@every 10m',
        config_id: '9d7be1fc-6732-4913-992f-a9e406903659',
        name: 'https://www.google.com',
        namespace: 'default',
        origin: 'ui',
        id: '9d7be1fc-6732-4913-992f-a9e406903659',
        'source.inline.script':
          "step('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n  await page.click('lllllll');\n});",
        urls: 'https://www.google.com',
        screenshots: 'on',
        ignore_https_errors: false,
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: '9d7be1fc-6732-4913-992f-a9e406903659' },
        fields_under_root: true,
        throttling: { download: 5, upload: 3, latency: 20 },
      },
    ],
  },
  {
    type: 'http',
    id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
    schedule: '@every 3m',
    enabled: false,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'http', type: 'synthetics' },
        type: 'http',
        enabled: false,
        schedule: '@every 3m',
        config_id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
        timeout: '16s',
        name: 'http',
        namespace: 'default',
        origin: 'ui',
        id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
        urls: 'https://www.google.com',
        max_redirects: '0',
        'response.include_body': 'on_error',
        'response.include_headers': true,
        'check.response.status': ['500'],
        'check.request.method': 'GET',
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: '30e7431d-ed65-4234-a89b-d4de1588e6bf' },
        fields_under_root: true,
      },
    ],
  },
  {
    type: 'browser',
    id: 'check if title is present-test-projects-default',
    schedule: '@every 10m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'browser', type: 'synthetics' },
        type: 'browser',
        enabled: true,
        schedule: '@every 10m',
        config_id: 'a5e5ebb9-26d4-4088-89ce-47c6ef773c85',
        name: 'check if title is present',
        namespace: 'default',
        origin: 'project',
        id: 'check if title is present-test-projects-default',
        playwright_options: { ignoreHTTPSErrors: false, headless: true },
        params: { url: 'https://elastic.github.io/synthetics-demo/' },
        'source.project.content':
          'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAZAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c8WQzU4DIRDH732KCSeatEt68aDx+xmM5yk7FnTLEGbWqk3fXbpbTY2NVw8QCP+P4eccPHNfEr2fuwehIk4Chg9s54szRx2KRu/kPWmgehKnJDrPhZ/Jq7iDVdwSJfrmcG1UJnGduShsv9JnIEp5BvSWqxN28FR4Debmd4W5mBw81vhA/gXiE2jUjiAK5EJCSc0M7BYyrmhW94Jrgd0ULq9gO4GhyZoO++QDYM5VjDXfg/2WAOAGow4JzYqV7ZjS9KWbXlTBbtjHJJQKRscZTmZ5TqIQCFsqcHkc3bFH5WJNWJghEQ4E7CgaPY3Sm95z0vozO502yndkjXLLYr6n2a/fYGLKfe3q0FPgbt9fIXkupXb8B6TjSV6x6/8CNs5+mtfw1iTazPcYTrIbJSvSW9USl71WZkf15gvk4AQwjwEVElEroAxLgpYTXZvh+QflT1BLBwhmqX0GUAEAABQDAABQSwECLQMUAAgACAAAACEAZql9BlABAAAUAwAAGQAAAAAAAAAAACAApIEAAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAEcAAACXAQAAAAA=',
        screenshots: 'on',
        'filter_journeys.match': 'check if title is present',
        ignore_https_errors: false,
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        original_space: 'default',
        fields: {
          config_id: 'a5e5ebb9-26d4-4088-89ce-47c6ef773c85',
          'monitor.project.name': 'test-projects',
          'monitor.project.id': 'test-projects',
        },
        fields_under_root: true,
        throttling: { download: 5, upload: 3, latency: 20 },
      },
    ],
  },
  {
    type: 'browser',
    id: 'check if input placeholder is correct-test-projects-default',
    schedule: '@every 10m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'browser', type: 'synthetics' },
        type: 'browser',
        enabled: true,
        schedule: '@every 10m',
        config_id: '01f28b5e-ddb9-4262-83f1-8a1c369aaddd',
        name: 'check if input placeholder is correct',
        namespace: 'default',
        origin: 'project',
        id: 'check if input placeholder is correct-test-projects-default',
        playwright_options: { ignoreHTTPSErrors: false, headless: true },
        params: { url: 'https://elastic.github.io/synthetics-demo/' },
        'source.project.content':
          'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAZAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c8WQzU4DIRDH732KCSeatEt68aDx+xmM5yk7FnTLEGbWqk3fXbpbTY2NVw8QCP+P4eccPHNfEr2fuwehIk4Chg9s54szRx2KRu/kPWmgehKnJDrPhZ/Jq7iDVdwSJfrmcG1UJnGduShsv9JnIEp5BvSWqxN28FR4Debmd4W5mBw81vhA/gXiE2jUjiAK5EJCSc0M7BYyrmhW94Jrgd0ULq9gO4GhyZoO++QDYM5VjDXfg/2WAOAGow4JzYqV7ZjS9KWbXlTBbtjHJJQKRscZTmZ5TqIQCFsqcHkc3bFH5WJNWJghEQ4E7CgaPY3Sm95z0vozO502yndkjXLLYr6n2a/fYGLKfe3q0FPgbt9fIXkupXb8B6TjSV6x6/8CNs5+mtfw1iTazPcYTrIbJSvSW9USl71WZkf15gvk4AQwjwEVElEroAxLgpYTXZvh+QflT1BLBwhmqX0GUAEAABQDAABQSwECLQMUAAgACAAAACEAZql9BlABAAAUAwAAGQAAAAAAAAAAACAApIEAAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAEcAAACXAQAAAAA=',
        screenshots: 'on',
        'filter_journeys.match': 'check if input placeholder is correct',
        ignore_https_errors: false,
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        original_space: 'default',
        fields: {
          config_id: '01f28b5e-ddb9-4262-83f1-8a1c369aaddd',
          'monitor.project.name': 'test-projects',
          'monitor.project.id': 'test-projects',
        },
        fields_under_root: true,
        throttling: { download: 5, upload: 3, latency: 20 },
      },
    ],
  },
];

const request2 = [
  {
    type: 'browser',
    id: '9d7be1fc-6732-4913-992f-a9e406903659',
    schedule: '@every 10m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'browser', type: 'synthetics' },
        type: 'browser',
        enabled: true,
        schedule: '@every 10m',
        config_id: '9d7be1fc-6732-4913-992f-a9e406903659',
        name: 'https://www.google.com',
        namespace: 'default',
        origin: 'ui',
        id: '9d7be1fc-6732-4913-992f-a9e406903659',
        'source.inline.script':
          "step('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n  await page.click('lllllll');\n});",
        urls: 'https://www.google.com',
        screenshots: 'on',
        ignore_https_errors: false,
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: '9d7be1fc-6732-4913-992f-a9e406903659' },
        fields_under_root: true,
        throttling: { download: 5, upload: 3, latency: 20 },
      },
    ],
  },
  {
    type: 'http',
    id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
    schedule: '@every 3m',
    enabled: false,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'http', type: 'synthetics' },
        type: 'http',
        enabled: false,
        schedule: '@every 3m',
        config_id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
        timeout: '16s',
        name: 'http',
        namespace: 'default',
        origin: 'ui',
        id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
        urls: 'https://www.google.com',
        max_redirects: '0',
        'response.include_body': 'on_error',
        'response.include_headers': true,
        'check.response.status': ['500'],
        'check.request.method': 'GET',
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: '30e7431d-ed65-4234-a89b-d4de1588e6bf' },
        fields_under_root: true,
      },
    ],
  },
  {
    type: 'http',
    id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
    schedule: '@every 3m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'http', type: 'synthetics' },
        type: 'http',
        enabled: true,
        schedule: '@every 3m',
        config_id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
        timeout: '16s',
        name: 'On Staging',
        namespace: 'default',
        origin: 'ui',
        id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
        urls: 'https://www.google.com',
        max_redirects: '0',
        'response.include_body': 'on_error',
        'response.include_headers': true,
        'check.request.method': 'GET',
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: '757f8635-bc6f-489d-b581-d0c409d4f6e0' },
        fields_under_root: true,
      },
    ],
  },
  {
    type: 'browser',
    id: 'b3696dd5-2779-4043-857d-2fe92da104f5',
    schedule: '@every 10m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'browser', type: 'synthetics' },
        type: 'browser',
        enabled: true,
        schedule: '@every 10m',
        config_id: 'b3696dd5-2779-4043-857d-2fe92da104f5',
        name: 'Invalid monitor',
        namespace: 'default',
        origin: 'ui',
        id: 'b3696dd5-2779-4043-857d-2fe92da104f5',
        'source.inline.script': "i don't want to run",
        screenshots: 'on',
        ignore_https_errors: false,
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: 'b3696dd5-2779-4043-857d-2fe92da104f5' },
        fields_under_root: true,
        throttling: { download: 5, upload: 3, latency: 20 },
      },
    ],
  },
];

const request3 = [
  {
    type: 'http',
    id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
    schedule: '@every 3m',
    enabled: true,
    data_stream: { namespace: 'default' },
    streams: [
      {
        data_stream: { dataset: 'http', type: 'synthetics' },
        type: 'http',
        enabled: true,
        schedule: '@every 3m',
        config_id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
        timeout: '16s',
        name: 'On Staging',
        namespace: 'default',
        origin: 'ui',
        id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
        urls: 'https://www.google.com',
        max_redirects: '0',
        'response.include_body': 'on_error',
        'response.include_headers': true,
        'check.request.method': 'GET',
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        fields: { config_id: '757f8635-bc6f-489d-b581-d0c409d4f6e0' },
        fields_under_root: true,
      },
    ],
  },
];

const testMonitors = [
  {
    type: 'browser',
    enabled: true,
    schedule: '@every 10m',
    config_id: '9d7be1fc-6732-4913-992f-a9e406903659',
    name: 'https://www.google.com',
    locations: [
      {
        geo: { lon: -95.86, lat: 41.25 },
        isServiceManaged: true,
        id: 'us_central',
        label: 'North America - US Central',
        isInvalid: false,
        url: 'https://us-central.synthetics.elastic.dev',
        status: 'beta',
      },
      {
        geo: { lon: -95.86, lat: 41.25 },
        isServiceManaged: true,
        id: 'us_central_qa',
        label: 'US Central QA',
        isInvalid: false,
        url: 'https://us-central1.synthetics.gcp.qa.cld.elstc.co',
        status: 'beta',
      },
    ],
    namespace: 'default',
    origin: 'ui',
    id: '9d7be1fc-6732-4913-992f-a9e406903659',
    'source.inline.script':
      "step('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n  await page.click('lllllll');\n});",
    urls: 'https://www.google.com',
    screenshots: 'on',
    ignore_https_errors: false,
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    fields: { config_id: '9d7be1fc-6732-4913-992f-a9e406903659' },
    fields_under_root: true,
    throttling: { download: 5, upload: 3, latency: 20 },
  },
  {
    type: 'http',
    enabled: false,
    schedule: '@every 3m',
    config_id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
    timeout: '16s',
    name: 'http',
    locations: [
      { isServiceManaged: true, id: 'us_central', label: 'North America - US Central' },
      { isServiceManaged: true, id: 'us_central_qa', label: 'US Central QA' },
    ],
    namespace: 'default',
    origin: 'ui',
    id: '30e7431d-ed65-4234-a89b-d4de1588e6bf',
    urls: 'https://www.google.com',
    max_redirects: '0',
    'response.include_body': 'on_error',
    'response.include_headers': true,
    'check.response.status': ['500'],
    'check.request.method': 'GET',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    fields: { config_id: '30e7431d-ed65-4234-a89b-d4de1588e6bf' },
    fields_under_root: true,
  },
  {
    type: 'browser',
    enabled: true,
    schedule: '@every 10m',
    config_id: 'a5e5ebb9-26d4-4088-89ce-47c6ef773c85',
    name: 'check if title is present',
    locations: [
      {
        geo: { lon: -95.86, lat: 41.25 },
        isServiceManaged: true,
        id: 'us_central',
        label: 'North America - US Central',
      },
    ],
    namespace: 'default',
    origin: 'project',
    id: 'check if title is present-test-projects-default',
    playwright_options: { ignoreHTTPSErrors: false, headless: true },
    params: { url: 'https://elastic.github.io/synthetics-demo/' },
    'source.project.content':
      'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAZAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c8WQzU4DIRDH732KCSeatEt68aDx+xmM5yk7FnTLEGbWqk3fXbpbTY2NVw8QCP+P4eccPHNfEr2fuwehIk4Chg9s54szRx2KRu/kPWmgehKnJDrPhZ/Jq7iDVdwSJfrmcG1UJnGduShsv9JnIEp5BvSWqxN28FR4Debmd4W5mBw81vhA/gXiE2jUjiAK5EJCSc0M7BYyrmhW94Jrgd0ULq9gO4GhyZoO++QDYM5VjDXfg/2WAOAGow4JzYqV7ZjS9KWbXlTBbtjHJJQKRscZTmZ5TqIQCFsqcHkc3bFH5WJNWJghEQ4E7CgaPY3Sm95z0vozO502yndkjXLLYr6n2a/fYGLKfe3q0FPgbt9fIXkupXb8B6TjSV6x6/8CNs5+mtfw1iTazPcYTrIbJSvSW9USl71WZkf15gvk4AQwjwEVElEroAxLgpYTXZvh+QflT1BLBwhmqX0GUAEAABQDAABQSwECLQMUAAgACAAAACEAZql9BlABAAAUAwAAGQAAAAAAAAAAACAApIEAAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAEcAAACXAQAAAAA=',
    screenshots: 'on',
    'filter_journeys.match': 'check if title is present',
    ignore_https_errors: false,
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    original_space: 'default',
    fields: {
      config_id: 'a5e5ebb9-26d4-4088-89ce-47c6ef773c85',
      'monitor.project.name': 'test-projects',
      'monitor.project.id': 'test-projects',
    },
    fields_under_root: true,
    throttling: { download: 5, upload: 3, latency: 20 },
  },
  {
    type: 'http',
    enabled: true,
    schedule: '@every 3m',
    config_id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
    timeout: '16s',
    name: 'On Staging',
    locations: [
      { isServiceManaged: true, id: 'us_central_staging', label: 'US Central Staging' },
      { isServiceManaged: true, id: 'us_central_qa', label: 'US Central QA' },
    ],
    namespace: 'default',
    origin: 'ui',
    id: '757f8635-bc6f-489d-b581-d0c409d4f6e0',
    urls: 'https://www.google.com',
    max_redirects: '0',
    'response.include_body': 'on_error',
    'response.include_headers': true,
    'check.request.method': 'GET',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    fields: { config_id: '757f8635-bc6f-489d-b581-d0c409d4f6e0' },
    fields_under_root: true,
  },
  {
    type: 'browser',
    enabled: true,
    schedule: '@every 10m',
    config_id: 'b3696dd5-2779-4043-857d-2fe92da104f5',
    name: 'Invalid monitor',
    locations: [{ id: 'us_central_qa', label: 'US Central QA', isServiceManaged: true }],
    namespace: 'default',
    origin: 'ui',
    id: 'b3696dd5-2779-4043-857d-2fe92da104f5',
    'source.inline.script': "i don't want to run",
    screenshots: 'on',
    ignore_https_errors: false,
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    fields: { config_id: 'b3696dd5-2779-4043-857d-2fe92da104f5' },
    fields_under_root: true,
    throttling: { download: 5, upload: 3, latency: 20 },
  },
  {
    type: 'browser',
    enabled: true,
    schedule: '@every 10m',
    config_id: '01f28b5e-ddb9-4262-83f1-8a1c369aaddd',
    name: 'check if input placeholder is correct',
    locations: [
      {
        id: 'us_central',
        label: 'North America - US Central',
        geo: { lat: 41.25, lon: -95.86 },
        isServiceManaged: true,
      },
    ],
    namespace: 'default',
    origin: 'project',
    id: 'check if input placeholder is correct-test-projects-default',
    playwright_options: { ignoreHTTPSErrors: false, headless: true },
    params: { url: 'https://elastic.github.io/synthetics-demo/' },
    'source.project.content':
      'UEsDBBQACAAIAAAAIQAAAAAAAAAAAAAAAAAZAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c8WQzU4DIRDH732KCSeatEt68aDx+xmM5yk7FnTLEGbWqk3fXbpbTY2NVw8QCP+P4eccPHNfEr2fuwehIk4Chg9s54szRx2KRu/kPWmgehKnJDrPhZ/Jq7iDVdwSJfrmcG1UJnGduShsv9JnIEp5BvSWqxN28FR4Debmd4W5mBw81vhA/gXiE2jUjiAK5EJCSc0M7BYyrmhW94Jrgd0ULq9gO4GhyZoO++QDYM5VjDXfg/2WAOAGow4JzYqV7ZjS9KWbXlTBbtjHJJQKRscZTmZ5TqIQCFsqcHkc3bFH5WJNWJghEQ4E7CgaPY3Sm95z0vozO502yndkjXLLYr6n2a/fYGLKfe3q0FPgbt9fIXkupXb8B6TjSV6x6/8CNs5+mtfw1iTazPcYTrIbJSvSW9USl71WZkf15gvk4AQwjwEVElEroAxLgpYTXZvh+QflT1BLBwhmqX0GUAEAABQDAABQSwECLQMUAAgACAAAACEAZql9BlABAAAUAwAAGQAAAAAAAAAAACAApIEAAAAAam91cm5leXMvYmFzaWMuam91cm5leS50c1BLBQYAAAAAAQABAEcAAACXAQAAAAA=',
    screenshots: 'on',
    'filter_journeys.match': 'check if input placeholder is correct',
    ignore_https_errors: false,
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    original_space: 'default',
    fields: {
      config_id: '01f28b5e-ddb9-4262-83f1-8a1c369aaddd',
      'monitor.project.name': 'test-projects',
      'monitor.project.id': 'test-projects',
    },
    fields_under_root: true,
    throttling: { download: 5, upload: 3, latency: 20 },
  },
] as any;

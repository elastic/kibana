/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConfigKey, DataStream, FormMonitorType, SyntheticsMonitor } from '../types';
import { DEFAULT_FIELDS } from '../constants';
import { formatDefaultFormValues } from './defaults';

describe('defaults', () => {
  const testScript = 'testScript';
  const monitorValues = {
    __ui: {
      script_source: {
        file_name: '',
        is_generated_script: false,
      },
    },
    enabled: true,
    'filter_journeys.match': '',
    'filter_journeys.tags': [],
    form_monitor_type: 'multistep',
    ignore_https_errors: false,
    journey_id: '',
    locations: [
      {
        id: 'us_central',
        isServiceManaged: true,
      },
    ],
    name: 'Browser monitor',
    namespace: 'default',
    origin: 'ui',
    params: '',
    playwright_options: '',
    playwright_text_assertion: '',
    project_id: '',
    schedule: {
      number: '10',
      unit: 'm',
    },
    screenshots: 'on',
    'service.name': '',
    'source.inline.script': testScript,
    'source.project.content': '',
    'source.zip_url.folder': '',
    'source.zip_url.password': '',
    'source.zip_url.proxy_url': '',
    'source.zip_url.ssl.certificate': undefined,
    'source.zip_url.ssl.certificate_authorities': undefined,
    'source.zip_url.ssl.key': undefined,
    'source.zip_url.ssl.key_passphrase': undefined,
    'source.zip_url.ssl.supported_protocols': undefined,
    'source.zip_url.ssl.verification_mode': undefined,
    'source.zip_url.url': '',
    'source.zip_url.username': '',
    'ssl.certificate': '',
    'ssl.certificate_authorities': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    'ssl.verification_mode': 'full',
    synthetics_args: [],
    tags: [],
    'throttling.config': '5d/3u/20l',
    'throttling.download_speed': '5',
    'throttling.is_enabled': true,
    'throttling.latency': '20',
    'throttling.upload_speed': '3',
    timeout: '16',
    type: 'browser',
    'url.port': null,
    urls: '',
    id: '',
    config_id: '',
  } as SyntheticsMonitor;

  it('correctly formats monitor type to form type', () => {
    expect(formatDefaultFormValues(monitorValues)).toEqual({
      ...monitorValues,
      __ui: {
        script_source: {
          file_name: '',
          is_generated_script: false,
        },
      },
      enabled: true,
      'filter_journeys.match': '',
      'filter_journeys.tags': [],
      form_monitor_type: 'multistep',
      ignore_https_errors: false,
      journey_id: '',
      locations: [
        {
          id: 'us_central',
          isServiceManaged: true,
        },
      ],
      name: 'Browser monitor',
      namespace: 'default',
      origin: 'ui',
      params: '',
      playwright_options: '',
      playwright_text_assertion: '',
      project_id: '',
      schedule: {
        number: '10',
        unit: 'm',
      },
      screenshots: 'on',
      'service.name': '',
      'source.inline': {
        fileName: '',
        script: 'testScript',
        type: 'inline',
      },
      'source.inline.script': 'testScript',
      'source.project.content': '',
      'source.zip_url.folder': '',
      'source.zip_url.password': '',
      'source.zip_url.proxy_url': '',
      'source.zip_url.ssl.certificate': undefined,
      'source.zip_url.ssl.certificate_authorities': undefined,
      'source.zip_url.ssl.key': undefined,
      'source.zip_url.ssl.key_passphrase': undefined,
      'source.zip_url.ssl.supported_protocols': undefined,
      'source.zip_url.ssl.verification_mode': undefined,
      'source.zip_url.url': '',
      'source.zip_url.username': '',
      'ssl.certificate': '',
      'ssl.certificate_authorities': '',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      'ssl.verification_mode': 'full',
      synthetics_args: [],
      tags: [],
      'throttling.config': '5d/3u/20l',
      'throttling.download_speed': '5',
      'throttling.is_enabled': true,
      'throttling.latency': '20',
      'throttling.upload_speed': '3',
      timeout: '16',
      type: 'browser',
      'url.port': null,
      urls: '',
    });
  });

  it.each([
    [DataStream.HTTP, true],
    [DataStream.HTTP, false],
    [DataStream.TCP, true],
    [DataStream.TCP, false],
  ])('correctly formats isTLSEnabled', (formType, isTLSEnabled) => {
    const monitor = {
      ...DEFAULT_FIELDS[formType as DataStream],
      [ConfigKey.FORM_MONITOR_TYPE]: formType as unknown as FormMonitorType,
      [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: 'mockCA',
      [ConfigKey.METADATA]: {
        is_tls_enabled: isTLSEnabled,
      },
    };
    expect(formatDefaultFormValues(monitor)).toEqual({
      ...monitor,
      [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: 'mockCA',
      isTLSEnabled,
    });
  });

  it.each([
    [DataStream.HTTP, FormMonitorType.HTTP],
    [DataStream.TCP, FormMonitorType.TCP],
    [DataStream.ICMP, FormMonitorType.ICMP],
    [DataStream.BROWSER, FormMonitorType.MULTISTEP],
  ])(
    'correctly formats legacy uptime monitors to include ConfigKey.FORM_MONITOR_TYPE',
    (dataStream, formType) => {
      const monitor = {
        ...DEFAULT_FIELDS[dataStream],
        [ConfigKey.FORM_MONITOR_TYPE]: undefined,
      };
      expect(formatDefaultFormValues(monitor as unknown as SyntheticsMonitor)).toEqual(
        expect.objectContaining({
          [ConfigKey.FORM_MONITOR_TYPE]: formType,
        })
      );
    }
  );
});

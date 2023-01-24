/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from './formatter';
import { DataStream } from '../../../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../../../common/constants/monitor_defaults';

describe('format', () => {
  let formValues: Record<string, unknown>;
  beforeEach(() => {
    formValues = {
      type: 'http',
      form_monitor_type: 'http',
      enabled: true,
      schedule: {
        number: '3',
        unit: 'm',
      },
      'service.name': '',
      tags: [],
      timeout: '16',
      name: 'Sample name',
      locations: [
        {
          id: 'us_central',
          isServiceManaged: true,
        },
      ],
      namespace: 'default',
      origin: 'ui',
      __ui: {
        is_tls_enabled: false,
      },
      urls: 'sample url',
      max_redirects: '0',
      password: '',
      proxy_url: '',
      'check.response.body.negative': [],
      'check.response.body.positive': [],
      'response.include_body': 'on_error',
      'check.response.headers': {},
      'response.include_headers': true,
      'check.response.status': [],
      'check.request.body': {
        value: '',
        type: 'text',
      },
      'check.request.headers': {},
      'check.request.method': 'GET',
      username: '',
      'ssl.certificate_authorities': '',
      'ssl.certificate': '',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.verification_mode': 'full',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      isTLSEnabled: false,
      service: {
        name: '',
      },
      check: {
        request: {
          method: 'GET',
          headers: {},
          body: {
            type: 'text',
            value: '',
          },
        },
        response: {
          status: [],
          headers: {},
          body: {
            positive: [],
            negative: [],
          },
        },
      },
      response: {
        include_headers: true,
        include_body: 'on_error',
      },
    };
  });

  it.each([[true], [false]])('correctly formats form fields to monitor type', (enabled) => {
    formValues.enabled = enabled;
    expect(format(formValues)).toEqual({
      ...DEFAULT_FIELDS[DataStream.HTTP],
      __ui: {
        is_tls_enabled: false,
      },
      config_id: '',
      'check.request.body': {
        type: 'text',
        value: '',
      },
      'check.request.headers': {},
      'check.request.method': 'GET',
      'check.response.body.negative': [],
      'check.response.body.positive': [],
      'check.response.headers': {},
      'check.response.status': [],
      enabled,
      form_monitor_type: 'http',
      journey_id: '',
      locations: [
        {
          id: 'us_central',
          isServiceManaged: true,
        },
      ],
      max_redirects: '0',
      name: 'Sample name',
      namespace: 'default',
      origin: 'ui',
      password: '',
      proxy_url: '',
      'response.include_body': 'on_error',
      'response.include_headers': true,
      schedule: {
        number: '3',
        unit: 'm',
      },
      'service.name': '',
      'ssl.certificate': '',
      'ssl.certificate_authorities': '',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      'ssl.verification_mode': 'full',
      tags: [],
      timeout: '16',
      type: 'http',
      urls: 'sample url',
      'url.port': null,
      username: '',
      id: '',
    });
  });

  it.each([
    ['recorder', true, 'testScriptRecorder', 'fileName'],
    ['inline', false, 'testScript', ''],
  ])(
    'correctly formats form fields to monitor type',
    (scriptType, isGeneratedScript, script, fileName) => {
      const browserFormFields = {
        type: 'browser',
        form_monitor_type: 'multistep',
        config_id: '',
        enabled: true,
        schedule: {
          unit: 'm',
          number: '10',
        },
        'service.name': '',
        tags: [],
        timeout: '16',
        name: 'Browser monitor',
        locations: [
          {
            id: 'us_central',
            isServiceManaged: true,
          },
        ],
        namespace: 'default',
        origin: 'ui',
        journey_id: '',
        project_id: '',
        playwright_options: '',
        __ui: {
          script_source: {
            is_generated_script: false,
            file_name: '',
          },
          is_zip_url_tls_enabled: false,
        },
        params: '',
        'source.inline.script': '',
        'source.project.content': '',
        'source.zip_url.url': '',
        'source.zip_url.username': '',
        'source.zip_url.password': '',
        'source.zip_url.folder': '',
        'source.zip_url.proxy_url': '',
        playwright_text_assertion: '',
        urls: '',
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
        'ssl.certificate_authorities': '',
        'ssl.certificate': '',
        'ssl.key': '',
        'ssl.key_passphrase': '',
        'ssl.verification_mode': 'full',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        'source.inline': {
          type: 'recorder',
          script: '',
          fileName: '',
        },
        throttling: {
          config: '5d/3u/20l',
        },
        source: {
          inline: {
            type: scriptType,
            script,
            fileName,
          },
        },
        service: {
          name: '',
        },
      };
      expect(format(browserFormFields)).toEqual({
        ...DEFAULT_FIELDS[DataStream.BROWSER],
        __ui: {
          script_source: {
            file_name: fileName,
            is_generated_script: isGeneratedScript,
          },
        },
        config_id: '',
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
        'source.inline.script': script,
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
      });
    }
  );

  it.each([true, false])('correctly formats isTLSEnabled', (isTLSEnabled) => {
    expect(
      format({
        ...formValues,
        isTLSEnabled,
        ssl: {
          // @ts-ignore next
          ...formValues.ssl,
          certificate_authorities: 'mockCA',
        },
      })
    ).toEqual({
      ...DEFAULT_FIELDS[DataStream.HTTP],
      __ui: {
        is_tls_enabled: isTLSEnabled,
      },
      config_id: '',
      'check.request.body': {
        type: 'text',
        value: '',
      },
      'check.request.headers': {},
      'check.request.method': 'GET',
      'check.response.body.negative': [],
      'check.response.body.positive': [],
      'check.response.headers': {},
      'check.response.status': [],
      enabled: true,
      form_monitor_type: 'http',
      journey_id: '',
      locations: [
        {
          id: 'us_central',
          isServiceManaged: true,
        },
      ],
      max_redirects: '0',
      name: 'Sample name',
      namespace: 'default',
      origin: 'ui',
      password: '',
      proxy_url: '',
      'response.include_body': 'on_error',
      'response.include_headers': true,
      schedule: {
        number: '3',
        unit: 'm',
      },
      'service.name': '',
      'ssl.certificate': '',
      'ssl.certificate_authorities': 'mockCA',
      'ssl.key': '',
      'ssl.key_passphrase': '',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      'ssl.verification_mode': 'full',
      tags: [],
      timeout: '16',
      type: 'http',
      urls: 'sample url',
      'url.port': null,
      username: '',
      id: '',
    });
  });
});

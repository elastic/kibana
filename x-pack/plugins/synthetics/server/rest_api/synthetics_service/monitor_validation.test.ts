/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserAdvancedFields,
  BrowserFields,
  BrowserSimpleFields,
  CommonFields,
  ConfigKey,
  DataStream,
  HTTPAdvancedFields,
  HTTPFields,
  HTTPSimpleFields,
  ICMPSimpleFields,
  Metadata,
  Mode,
  MonitorFields,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  TCPAdvancedFields,
  TCPFields,
  TCPSimpleFields,
  TLSFields,
  TLSVersion,
  VerificationMode,
  ZipUrlTLSFields,
} from '../../../common/runtime_types';
import { validateMonitor } from './monitor_validation';

describe('validateMonitor', () => {
  let testSchedule;
  let testTags: string[];
  let testCommonFields: CommonFields;
  let testMetaData: Metadata;
  let testICMPFields: ICMPSimpleFields;
  let testTCPSimpleFields: TCPSimpleFields;
  let testTCPAdvancedFields: TCPAdvancedFields;
  let testTCPFields: TCPFields;
  let testTLSFields: TLSFields;
  let testHTTPSimpleFields: HTTPSimpleFields;
  let testHTTPAdvancedFields: HTTPAdvancedFields;
  let testHTTPFields: HTTPFields;
  let testZipUrlTLSFields: ZipUrlTLSFields;
  let testBrowserSimpleFields: BrowserSimpleFields;
  let testBrowserAdvancedFields: BrowserAdvancedFields;
  let testBrowserFields: BrowserFields;

  beforeEach(() => {
    testSchedule = { number: '5', unit: ScheduleUnit.MINUTES };
    testTags = ['tag1', 'tag2'];
    testCommonFields = {
      [ConfigKey.MONITOR_TYPE]: DataStream.ICMP,
      [ConfigKey.NAME]: 'test-monitor-name',
      [ConfigKey.ENABLED]: true,
      [ConfigKey.TAGS]: testTags,
      [ConfigKey.SCHEDULE]: testSchedule,
      [ConfigKey.APM_SERVICE_NAME]: '',
      [ConfigKey.TIMEOUT]: '3m',
      [ConfigKey.LOCATIONS]: [
        {
          id: 'eu-west-1',
          label: 'EU West',
          geo: {
            lat: 33.4354332,
            lon: 73.4453553,
          },
          isServiceManaged: true,
          url: 'https://test-url.com',
        },
      ],
      [ConfigKey.NAMESPACE]: 'testnamespace',
    };
    testMetaData = {
      is_tls_enabled: false,
      is_zip_url_tls_enabled: false,
      script_source: {
        is_generated_script: false,
        file_name: 'test-file.name',
      },
    };

    testICMPFields = {
      ...testCommonFields,
      [ConfigKey.HOSTS]: 'test-hosts',
      [ConfigKey.WAIT]: '',
      [ConfigKey.MONITOR_TYPE]: DataStream.ICMP,
    };

    testTLSFields = {
      [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: 't.string',
      [ConfigKey.TLS_CERTIFICATE]: 't.string',
      [ConfigKey.TLS_KEY]: 't.string',
      [ConfigKey.TLS_KEY_PASSPHRASE]: 't.string',
      [ConfigKey.TLS_VERIFICATION_MODE]: VerificationMode.CERTIFICATE,
      [ConfigKey.TLS_VERSION]: [TLSVersion.ONE_ONE, TLSVersion.ONE_TWO],
    };

    testTCPSimpleFields = {
      ...testCommonFields,
      [ConfigKey.METADATA]: testMetaData,
      [ConfigKey.HOSTS]: 'https://host1.com',
    };

    testTCPAdvancedFields = {
      [ConfigKey.PROXY_URL]: 'http://proxy-url.com',
      [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: false,
      [ConfigKey.RESPONSE_RECEIVE_CHECK]: '',
      [ConfigKey.REQUEST_SEND_CHECK]: '',
    };

    testTCPFields = {
      ...testTCPSimpleFields,
      ...testTCPAdvancedFields,
      ...testTLSFields,
      [ConfigKey.MONITOR_TYPE]: DataStream.TCP,
    };

    testHTTPSimpleFields = {
      ...testCommonFields,
      [ConfigKey.METADATA]: testMetaData,
      [ConfigKey.MAX_REDIRECTS]: '3',
      [ConfigKey.URLS]: 'https://example.com',
    };

    testHTTPAdvancedFields = {
      [ConfigKey.PASSWORD]: 'test',
      [ConfigKey.PROXY_URL]: 'http://proxy.com',
      [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: [],
      [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: [],
      [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.NEVER,
      [ConfigKey.RESPONSE_HEADERS_CHECK]: {},
      [ConfigKey.RESPONSE_HEADERS_INDEX]: true,
      [ConfigKey.RESPONSE_STATUS_CHECK]: ['200', '201'],
      [ConfigKey.REQUEST_BODY_CHECK]: { value: 'testValue', type: Mode.JSON },
      [ConfigKey.REQUEST_HEADERS_CHECK]: {},
      [ConfigKey.REQUEST_METHOD_CHECK]: '',
      [ConfigKey.USERNAME]: 'test-username',
    };

    testHTTPFields = {
      ...testHTTPSimpleFields,
      ...testHTTPAdvancedFields,
      ...testTLSFields,
      [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
    };

    testZipUrlTLSFields = {
      [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: 'test',
      [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: 'test',
      [ConfigKey.ZIP_URL_TLS_KEY]: 'key',
      [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: 'passphrase',
      [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: VerificationMode.STRICT,
      [ConfigKey.ZIP_URL_TLS_VERSION]: [TLSVersion.ONE_ONE, TLSVersion.ONE_TWO],
    };

    testBrowserSimpleFields = {
      ...testZipUrlTLSFields,
      ...testCommonFields,
      [ConfigKey.METADATA]: testMetaData,
      [ConfigKey.SOURCE_INLINE]: '',
      [ConfigKey.SOURCE_ZIP_URL]: '',
      [ConfigKey.SOURCE_ZIP_FOLDER]: '',
      [ConfigKey.SOURCE_ZIP_USERNAME]: 'test-username',
      [ConfigKey.SOURCE_ZIP_PASSWORD]: 'password',
      [ConfigKey.SOURCE_ZIP_PROXY_URL]: 'http://proxy-url.com',
      [ConfigKey.PARAMS]: '',
      [ConfigKey.URLS]: undefined,
      [ConfigKey.PORT]: undefined,
    };

    testBrowserAdvancedFields = {
      [ConfigKey.SYNTHETICS_ARGS]: ['arg1', 'arg2'],
      [ConfigKey.SCREENSHOTS]: 'false',
      [ConfigKey.JOURNEY_FILTERS_MATCH]: 'false',
      [ConfigKey.JOURNEY_FILTERS_TAGS]: testTags,
      [ConfigKey.IGNORE_HTTPS_ERRORS]: false,
      [ConfigKey.IS_THROTTLING_ENABLED]: true,
      [ConfigKey.DOWNLOAD_SPEED]: '5',
      [ConfigKey.UPLOAD_SPEED]: '3',
      [ConfigKey.LATENCY]: '20',
      [ConfigKey.THROTTLING_CONFIG]: '5d/3u/20l',
    };

    testBrowserFields = {
      ...testBrowserSimpleFields,
      ...testBrowserAdvancedFields,
      [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
    };
  });

  describe('should invalidate', () => {
    it(`when 'type' is null or undefined`, () => {
      const testMonitor = { type: undefined } as unknown as MonitorFields;
      const result = validateMonitor(testMonitor);
      expect(result).toMatchObject({
        valid: false,
        reason: 'Monitor type is invalid',
        details: expect.stringMatching(/(?=.*invalid)(?=.*DataStream)/i),
      });
    });

    it(`when 'type' is not an acceptable monitor type (DataStream)`, () => {
      const monitor = { type: 'non-HTTP' } as unknown as MonitorFields;
      const result = validateMonitor(monitor);
      expect(result).toMatchObject({
        valid: false,
        reason: 'Monitor type is invalid',
        details: expect.stringMatching(/(?=.*invalid)(?=.*non-HTTP)(?=.*DataStream)/i),
      });
    });
  });

  describe('should validate', () => {
    it('when payload is a correct ICMP monitor', () => {
      const testMonitor = testICMPFields as MonitorFields;
      const result = validateMonitor(testMonitor);
      expect(result).toMatchObject({
        valid: true,
        reason: '',
        details: '',
        payload: testMonitor,
      });
    });

    it('when payload is a correct TCP monitor', () => {
      const testMonitor = testTCPFields as MonitorFields;
      const result = validateMonitor(testMonitor);
      expect(result).toMatchObject({
        valid: true,
        reason: '',
        details: '',
        payload: testMonitor,
      });
    });

    it('when payload is a correct HTTP monitor', () => {
      const testMonitor = testHTTPFields as MonitorFields;

      const result = validateMonitor(testMonitor);
      expect(result).toMatchObject({
        valid: true,
        reason: '',
        details: '',
        payload: testMonitor,
      });
    });

    it('when payload is a correct Browser monitor', () => {
      const testMonitor = testBrowserFields as MonitorFields;
      const result = validateMonitor(testMonitor);
      expect(result).toMatchObject({
        valid: true,
        reason: '',
        details: '',
        payload: testMonitor,
      });
    });
  });

  describe('should invalidate when incomplete properties are received', () => {
    it('for ICMP monitor', () => {
      const testMonitor = {
        ...testICMPFields,
        ...({
          [ConfigKey.HOSTS]: undefined,
        } as unknown as Partial<ICMPSimpleFields>),
      } as MonitorFields;

      const result = validateMonitor(testMonitor);

      expect(result.details).toEqual(expect.stringContaining('Invalid value'));
      expect(result.details).toEqual(expect.stringContaining(ConfigKey.HOSTS));
      expect(result).toMatchObject({
        valid: false,
        reason: `Monitor is not a valid monitor of type ${DataStream.ICMP}`,
        payload: testMonitor,
      });
    });

    it('for TCP monitor', () => {
      const testMonitor = {
        ...testTCPFields,
        ...({
          [ConfigKey.NAME]: undefined,
        } as unknown as Partial<TCPFields>),
      } as MonitorFields;

      const result = validateMonitor(testMonitor);

      expect(result.details).toEqual(expect.stringContaining('Invalid value'));
      expect(result.details).toEqual(expect.stringContaining(ConfigKey.NAME));
      expect(result).toMatchObject({
        valid: false,
        reason: `Monitor is not a valid monitor of type ${DataStream.TCP}`,
        payload: testMonitor,
      });
    });

    it('for HTTP monitor', () => {
      const testMonitor = {
        ...testHTTPFields,
        ...({
          [ConfigKey.URLS]: undefined,
        } as unknown as Partial<HTTPFields>),
      } as MonitorFields;

      const result = validateMonitor(testMonitor);

      expect(result.details).toEqual(expect.stringContaining('Invalid value'));
      expect(result.details).toEqual(expect.stringContaining(ConfigKey.URLS));
      expect(result).toMatchObject({
        valid: false,
        reason: `Monitor is not a valid monitor of type ${DataStream.HTTP}`,
        payload: testMonitor,
      });
    });

    it('for Browser monitor', () => {
      const testMonitor = {
        ...testBrowserFields,
        ...({
          [ConfigKey.SOURCE_INLINE]: undefined,
        } as unknown as Partial<BrowserFields>),
      } as MonitorFields;

      const result = validateMonitor(testMonitor);

      expect(result.details).toEqual(expect.stringContaining('Invalid value'));
      expect(result.details).toEqual(expect.stringContaining(ConfigKey.SOURCE_INLINE));
      expect(result).toMatchObject({
        valid: false,
        reason: `Monitor is not a valid monitor of type ${DataStream.BROWSER}`,
        payload: testMonitor,
      });
    });
  });

  // The following should fail when strict typing/validation is in place
  describe('should pass validation when mixed props', () => {
    it('of HTTP is provided into TCP', () => {
      const testMonitor = {
        ...testTCPFields,
        ...({
          [ConfigKey.RESPONSE_HEADERS_CHECK]: undefined,
        } as unknown as Partial<TCPFields>),
      } as MonitorFields;

      const result = validateMonitor(testMonitor);

      expect(result).toMatchObject({
        valid: true,
        reason: '',
        details: '',
        payload: testMonitor,
      });
    });
  });

  describe('should validate payload', () => {
    it('when parsed from serialized JSON', () => {
      const testMonitor = getJsonPayload() as MonitorFields;

      const result = validateMonitor(testMonitor);

      expect(result).toMatchObject({
        valid: true,
        reason: '',
        details: '',
        payload: testMonitor,
      });
    });
  });
});

function getJsonPayload() {
  const json =
    '{' +
    '  "type": "http",' +
    '  "enabled": true, ' +
    '  "tags": [' +
    '    "tag1",' +
    '    "tag2"' +
    '  ],' +
    '  "schedule": {' +
    '    "number": "5",' +
    '    "unit": "m"' +
    '  },' +
    '  "service.name": "",' +
    '  "timeout": "3m",' +
    '  "__ui": {' +
    '    "is_tls_enabled": false,' +
    '    "is_zip_url_tls_enabled": false,' +
    '    "script_source": {' +
    '      "is_generated_script": false,' +
    '      "file_name": "test-file.name"' +
    '    }' +
    '  },' +
    '  "max_redirects": "3",' +
    '  "password": "test",' +
    '  "urls": "https://nextjs-test-synthetics.vercel.app/api/users",' +
    '  "proxy_url": "http://proxy.com",' +
    '  "check.response.body.negative": [],' +
    '  "check.response.body.positive": [],' +
    '  "response.include_body": "never",' +
    '  "check.response.headers": {},' +
    '  "response.include_headers": true,' +
    '  "check.response.status": [' +
    '    "200",' +
    '    "201"' +
    '  ],' +
    '  "check.request.body": {' +
    '    "value": "testValue",' +
    '    "type": "json"' +
    '  },' +
    '  "check.request.headers": {},' +
    '  "check.request.method": "",' +
    '  "username": "test-username",' +
    '  "ssl.certificate_authorities": "t.string",' +
    '  "ssl.certificate": "t.string",' +
    '  "ssl.key": "t.string",' +
    '  "ssl.key_passphrase": "t.string",' +
    '  "ssl.verification_mode": "certificate",' +
    '  "ssl.supported_protocols": [' +
    '    "TLSv1.1",' +
    '    "TLSv1.2"' +
    '  ],' +
    '  "name": "test-monitor-name",' +
    '  "namespace": "testnamespace",' +
    '  "locations": [{' +
    '    "id": "eu-west-01",' +
    '    "label": "Europe West",' +
    '    "geo": {' +
    '      "lat": 33.2343132435,' +
    '      "lon": 73.2342343434' +
    '    },' +
    '    "url": "https://example-url.com",' +
    '    "isServiceManaged": true' +
    '  }]' +
    '}';

  return JSON.parse(json);
}

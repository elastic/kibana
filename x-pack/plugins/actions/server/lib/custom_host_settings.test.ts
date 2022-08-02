/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync as fsReadFileSync } from 'fs';
import { resolve as pathResolve, join as pathJoin } from 'path';
import { schema, ByteSizeValue } from '@kbn/config-schema';
import moment from 'moment';

import { ActionsConfig } from '../config';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { resolveCustomHosts, getCanonicalCustomHostUrl } from './custom_host_settings';

const CA_DIR = '../../../../../../packages/kbn-dev-utils/certs';
const CA_FILE1 = pathResolve(__filename, pathJoin(CA_DIR, 'ca.crt'));
const CA_CONTENTS1 = fsReadFileSync(CA_FILE1, 'utf8');
const CA_FILE2 = pathResolve(__filename, pathJoin(CA_DIR, 'kibana.crt'));
const CA_CONTENTS2 = fsReadFileSync(CA_FILE2, 'utf8');

let mockLogger: Logger = loggingSystemMock.create().get();

function warningLogs() {
  const calls = loggingSystemMock.collect(mockLogger).warn;
  return calls.map((call) => `${call[0]}`);
}

describe('custom_host_settings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockLogger = loggingSystemMock.create().get();
  });

  describe('getCanonicalCustomHostUrl()', () => {
    test('minimal urls', () => {
      expect(getCanonicalCustomHostUrl(new URL('http://elastic.com'))).toBe(
        'http://elastic.com:80'
      );
      expect(getCanonicalCustomHostUrl(new URL('https://elastic.co'))).toBe(
        'https://elastic.co:443'
      );
      expect(getCanonicalCustomHostUrl(new URL('smtp://mail.elastic.co'))).toBe(
        'smtp://mail.elastic.co:25'
      );
      expect(warningLogs()).toEqual([]);
    });

    test('maximal urls', () => {
      expect(
        getCanonicalCustomHostUrl(new URL('http://user1:pass1@elastic.co:81/foo?bar#car'))
      ).toBe('http://elastic.co:81');
      expect(
        getCanonicalCustomHostUrl(new URL('https://user1:pass1@elastic.co:82/foo?bar#car'))
      ).toBe('https://elastic.co:82');
      expect(
        getCanonicalCustomHostUrl(new URL('smtp://user1:pass1@mail.elastic.co:83/foo?bar#car'))
      ).toBe('smtp://mail.elastic.co:83');
      expect(warningLogs()).toEqual([]);
    });
  });

  describe('resolveCustomHosts()', () => {
    const defaultActionsConfig: ActionsConfig = {
      allowedHosts: [],
      enabledActionTypes: [],
      preconfiguredAlertHistoryEsIndex: false,
      preconfigured: {},
      proxyRejectUnauthorizedCertificates: true,
      rejectUnauthorized: true,
      maxResponseContentLength: new ByteSizeValue(1000000),
      responseTimeout: moment.duration(60000),
      cleanupFailedExecutionsTask: {
        enabled: true,
        cleanupInterval: schema.duration().validate('5m'),
        idleInterval: schema.duration().validate('1h'),
        pageSize: 100,
      },
    };

    test('ensure it copies over the config parts that it does not touch', () => {
      const config: ActionsConfig = { ...defaultActionsConfig };
      const resConfig = resolveCustomHosts(mockLogger, config);
      expect(resConfig).toMatchObject(config);
      expect(config).toMatchObject(resConfig);
      expect(warningLogs()).toEqual([]);
    });

    test('handles undefined customHostSettings', () => {
      const config: ActionsConfig = { ...defaultActionsConfig, customHostSettings: undefined };
      const resConfig = resolveCustomHosts(mockLogger, config);
      expect(resConfig).toMatchObject(config);
      expect(config).toMatchObject(resConfig);
      expect(warningLogs()).toEqual([]);
    });

    test('handles empty object customHostSettings', () => {
      const config: ActionsConfig = { ...defaultActionsConfig, customHostSettings: [] };
      const resConfig = resolveCustomHosts(mockLogger, config);
      expect(resConfig).toMatchObject(config);
      expect(config).toMatchObject(resConfig);
      expect(warningLogs()).toEqual([]);
    });

    test('handles multiple valid settings', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://elastic.co:443',
            ssl: {
              certificateAuthoritiesData: 'xyz',
              rejectUnauthorized: false,
            },
          },
          {
            url: 'smtp://mail.elastic.com:25',
            ssl: {
              certificateAuthoritiesData: 'abc',
              rejectUnauthorized: true,
            },
            smtp: {
              ignoreTLS: true,
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      expect(resConfig).toMatchObject(config);
      expect(config).toMatchObject(resConfig);
      expect(warningLogs()).toEqual([]);
    });

    test('handles bad url', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'this! is! not! a! url!',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = { ...config, customHostSettings: [] };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, invalid URL \\"this! is! not! a! url!\\", ignoring; error: Invalid URL: this! is! not! a! url!",
        ]
      `);
    });

    test('handles bad port', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:0',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = { ...config, customHostSettings: [] };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, unable to determine port for URL \\"https://almost.purrfect.com:0\\", ignoring",
        ]
      `);
    });

    test('handles auth info', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://kitty:cat@almost.purrfect.com',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, URL \\"https://kitty:cat@almost.purrfect.com\\" contains authentication information which will be ignored, but should be removed from the configuration",
        ]
      `);
    });

    test('handles hash', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com#important',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, URL \\"https://almost.purrfect.com#important\\" contains hash information which will be ignored",
        ]
      `);
    });

    test('handles path', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/about',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, URL \\"https://almost.purrfect.com/about\\" contains path information which will be ignored",
        ]
      `);
    });

    test('handles / path same as no path, since we have no choice', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toEqual([]);
    });

    test('handles unsupported URL protocols', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'http://almost.purrfect.com/',
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, unsupported protocol used in URL \\"http://almost.purrfect.com/\\", ignoring",
        ]
      `);
    });

    test('handles smtp options for non-smtp urls', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
            smtp: {
              ignoreTLS: true,
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, URL \\"https://almost.purrfect.com/\\" contains smtp properties but does not use smtp; ignoring smtp properties",
        ]
      `);
    });

    test('handles ca files not found', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
            ssl: {
              certificateAuthoritiesFiles: 'this-file-does-not-exist',
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
            ssl: {
              certificateAuthoritiesFiles: 'this-file-does-not-exist',
            },
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "error reading file \\"this-file-does-not-exist\\" specified in xpack.actions.customHosts, ignoring: ENOENT: no such file or directory, open 'this-file-does-not-exist'",
        ]
      `);
    });

    test('handles a single ca file', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
            ssl: {
              certificateAuthoritiesFiles: CA_FILE1,
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);

      // not checking the full structure anymore, just ca bits
      expect(resConfig?.customHostSettings?.[0].ssl?.certificateAuthoritiesData).toBe(CA_CONTENTS1);
      expect(warningLogs()).toEqual([]);
    });

    test('handles multiple ca files', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
            ssl: {
              certificateAuthoritiesFiles: [CA_FILE1, CA_FILE2],
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);

      // not checking the full structure anymore, just ca bits
      expect(resConfig?.customHostSettings?.[0].ssl?.certificateAuthoritiesData).toBe(
        `${CA_CONTENTS1}\n${CA_CONTENTS2}`
      );
      expect(warningLogs()).toEqual([]);
    });

    test('handles ca files and ca data', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
            ssl: {
              certificateAuthoritiesFiles: [CA_FILE2],
              certificateAuthoritiesData: CA_CONTENTS1,
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);

      // not checking the full structure anymore, just ca bits
      expect(resConfig?.customHostSettings?.[0].ssl?.certificateAuthoritiesData).toBe(
        `${CA_CONTENTS1}\n${CA_CONTENTS2}`
      );
      expect(warningLogs()).toEqual([]);
    });

    test('handles smtp ignoreTLS and requireTLS both used', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'smtp://almost.purrfect.com/',
            smtp: {
              ignoreTLS: true,
              requireTLS: true,
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'smtp://almost.purrfect.com:25',
            smtp: {
              ignoreTLS: false,
              requireTLS: true,
            },
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, URL \\"smtp://almost.purrfect.com/\\" cannot have both requireTLS and ignoreTLS set to true; using requireTLS: true and ignoreTLS: false",
        ]
      `);
    });

    test('handles duplicate URLs', () => {
      const config: ActionsConfig = {
        ...defaultActionsConfig,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com/',
            ssl: {
              rejectUnauthorized: true,
            },
          },
          {
            url: 'https://almost.purrfect.com:443',
            ssl: {
              rejectUnauthorized: false,
            },
          },
        ],
      };
      const resConfig = resolveCustomHosts(mockLogger, config);
      const expConfig = {
        ...config,
        customHostSettings: [
          {
            url: 'https://almost.purrfect.com:443',
            ssl: {
              rejectUnauthorized: true,
            },
          },
        ],
      };
      expect(resConfig).toMatchObject(expConfig);
      expect(expConfig).toMatchObject(resConfig);
      expect(warningLogs()).toMatchInlineSnapshot(`
        Array [
          "In configuration xpack.actions.customHosts, multiple URLs match the canonical url \\"https://almost.purrfect.com:443\\"; only the first will be used",
        ]
      `);
    });
  });
});

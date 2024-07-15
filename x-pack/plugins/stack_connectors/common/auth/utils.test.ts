/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthType } from './constants';
import { buildConnectorAuth, isBasicAuth, validateConnectorAuthConfiguration } from './utils';

describe('utils', () => {
  describe('isBasicAuth', () => {
    it('returns false when hasAuth is false and authType is undefined', () => {
      expect(
        isBasicAuth({
          hasAuth: false,
          authType: undefined,
        })
      ).toBe(false);
    });

    it('returns false when hasAuth is false and authType is basic', () => {
      expect(
        isBasicAuth({
          hasAuth: false,
          authType: AuthType.Basic,
        })
      ).toBe(false);
    });

    it('returns false when hasAuth is true and authType is ssl', () => {
      expect(
        isBasicAuth({
          hasAuth: true,
          authType: AuthType.SSL,
        })
      ).toBe(false);
    });

    it('returns true when hasAuth is true and authType is undefined', () => {
      expect(
        isBasicAuth({
          hasAuth: true,
          authType: undefined,
        })
      ).toBe(true);
    });

    it('returns true when hasAuth is true and authType is basic', () => {
      expect(
        isBasicAuth({
          hasAuth: true,
          authType: AuthType.Basic,
        })
      ).toBe(true);
    });
  });

  describe('validateConnectorAuthConfiguration', () => {
    it('does not throw with correct authType=basic params', () => {
      expect(() =>
        validateConnectorAuthConfiguration({
          hasAuth: true,
          authType: AuthType.Basic,
          basicAuth: { auth: { username: 'foo', password: 'bar' } },
          sslOverrides: {},
          connectorName: 'foobar',
        })
      ).not.toThrow();
    });

    it('does not throw with correct authType=undefined params', () => {
      expect(() =>
        validateConnectorAuthConfiguration({
          hasAuth: true,
          authType: undefined,
          basicAuth: { auth: { username: 'foo', password: 'bar' } },
          sslOverrides: {},
          connectorName: 'foobar',
        })
      ).not.toThrow();
    });

    it('throws when type is basic and the username is missing', () => {
      expect(() =>
        validateConnectorAuthConfiguration({
          hasAuth: true,
          authType: undefined,
          // @ts-ignore: that's what we are testing
          basicAuth: { auth: { password: 'bar' } },
          sslOverrides: {},
          connectorName: 'Foobar',
        })
      ).toThrow('[Action]Foobar: Wrong configuration.');
    });

    it('throws when type is basic and the password is missing', () => {
      expect(() =>
        validateConnectorAuthConfiguration({
          hasAuth: true,
          authType: undefined,
          // @ts-ignore: that's what we are testing
          basicAuth: { auth: { username: 'foo' } },
          sslOverrides: {},
          connectorName: 'Foobar',
        })
      ).toThrow('[Action]Foobar: Wrong configuration.');
    });

    it('does not throw with correct authType=ssl params', () => {
      expect(() =>
        validateConnectorAuthConfiguration({
          hasAuth: true,
          authType: AuthType.SSL,
          basicAuth: {},
          sslOverrides: { verificationMode: 'none', passphrase: 'passphrase' },
          connectorName: 'foobar',
        })
      ).not.toThrow();
    });

    it('throws when type is SSL and the sslOverrides are missing', () => {
      expect(() =>
        validateConnectorAuthConfiguration({
          hasAuth: true,
          authType: AuthType.SSL,
          basicAuth: {},
          sslOverrides: {},
          connectorName: 'Foobar',
        })
      ).toThrow('[Action]Foobar: Wrong configuration.');
    });
  });

  describe('buildConnectorAuth', () => {
    it('returns empty objects when hasAuth=false', () => {
      expect(
        buildConnectorAuth({
          hasAuth: false,
          authType: AuthType.SSL,
          secrets: { user: 'foo', password: 'bar', crt: null, key: null, pfx: null },
          verificationMode: undefined,
          ca: undefined,
        })
      ).toEqual({ basicAuth: {}, sslOverrides: {} });
    });

    it('builds basicAuth correctly with authType=basic', () => {
      expect(
        buildConnectorAuth({
          hasAuth: true,
          authType: AuthType.Basic,
          secrets: { user: 'foo', password: 'bar', crt: null, key: null, pfx: null },
          verificationMode: undefined,
          ca: undefined,
        })
      ).toEqual({ basicAuth: { auth: { username: 'foo', password: 'bar' } }, sslOverrides: {} });
    });

    it('builds basicAuth correctly with hasAuth=true and authType=undefined', () => {
      expect(
        buildConnectorAuth({
          hasAuth: true,
          authType: undefined,
          secrets: { user: 'foo', password: 'bar', crt: null, key: null, pfx: null },
          verificationMode: undefined,
          ca: undefined,
        })
      ).toEqual({ basicAuth: { auth: { username: 'foo', password: 'bar' } }, sslOverrides: {} });
    });

    it('builds sslOverrides correctly with authType=ssl', () => {
      expect(
        buildConnectorAuth({
          hasAuth: true,
          authType: AuthType.SSL,
          secrets: { user: 'foo', password: 'bar', crt: 'null', key: 'null', pfx: 'null' },
          verificationMode: 'certificate',
          ca: 'foobar?',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "basicAuth": Object {},
          "sslOverrides": Object {
            "ca": Object {
              "data": Array [
                126,
                138,
                27,
                106,
              ],
              "type": "Buffer",
            },
            "passphrase": "bar",
            "pfx": Object {
              "data": Array [
                158,
                233,
                101,
              ],
              "type": "Buffer",
            },
            "verificationMode": "certificate",
          },
        }
      `);
    });
  });
});

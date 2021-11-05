/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRESTApiError, isFieldInvalid, isDeprecatedConnector } from './helpers';

describe('helpers', () => {
  describe('isRESTApiError', () => {
    const resError = { error: { message: 'error', detail: 'access denied' }, status: '401' };

    test('should return true if the error is RESTApiError', async () => {
      expect(isRESTApiError(resError)).toBeTruthy();
    });

    test('should return true if there is failure status', async () => {
      // @ts-expect-error
      expect(isRESTApiError({ status: 'failure' })).toBeTruthy();
    });

    test('should return false if there is no error', async () => {
      // @ts-expect-error
      expect(isRESTApiError({ whatever: 'test' })).toBeFalsy();
    });
  });

  describe('isFieldInvalid', () => {
    test('should return true if the field is invalid', async () => {
      expect(isFieldInvalid('description', ['required'])).toBeTruthy();
    });

    test('should return if false the field is not defined', async () => {
      expect(isFieldInvalid(undefined, ['required'])).toBeFalsy();
    });

    test('should return if false the field is null', async () => {
      expect(isFieldInvalid(null, ['required'])).toBeFalsy();
    });

    test('should return if false the error is not defined', async () => {
      // @ts-expect-error
      expect(isFieldInvalid('description', undefined)).toBeFalsy();
    });

    test('should return if false the error is empty', async () => {
      expect(isFieldInvalid('description', [])).toBeFalsy();
    });
  });

  describe('isDeprecatedConnector', () => {
    const connector = {
      id: 'test',
      actionTypeId: '.webhook',
      name: 'Test',
      config: { apiUrl: 'http://example.com', usesTableApi: false },
      secrets: { username: 'test', password: 'test' },
      isPreconfigured: false as const,
    };

    it('returns false if the connector is not defined', () => {
      expect(isDeprecatedConnector()).toBe(false);
    });

    it('returns false if the connector is not ITSM or SecOps', () => {
      expect(isDeprecatedConnector(connector)).toBe(false);
    });

    it('returns false if the connector is .servicenow and the usesTableApi=false', () => {
      expect(isDeprecatedConnector({ ...connector, actionTypeId: '.servicenow' })).toBe(false);
    });

    it('returns false if the connector is .servicenow-sir and the usesTableApi=false', () => {
      expect(isDeprecatedConnector({ ...connector, actionTypeId: '.servicenow-sir' })).toBe(false);
    });

    it('returns true if the connector is .servicenow and the usesTableApi=true', () => {
      expect(
        isDeprecatedConnector({
          ...connector,
          actionTypeId: '.servicenow',
          config: { ...connector.config, usesTableApi: true },
        })
      ).toBe(true);
    });

    it('returns true if the connector is .servicenow-sir and the usesTableApi=true', () => {
      expect(
        isDeprecatedConnector({
          ...connector,
          actionTypeId: '.servicenow-sir',
          config: { ...connector.config, usesTableApi: true },
        })
      ).toBe(true);
    });
  });
});

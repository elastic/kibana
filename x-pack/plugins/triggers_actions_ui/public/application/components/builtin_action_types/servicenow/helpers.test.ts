/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isRESTApiError,
  isFieldInvalid,
  getConnectorDescriptiveTitle,
  getSelectedConnectorIcon,
} from './helpers';
import { ActionConnector } from '../../../../types';

const deprecatedConnector: ActionConnector = {
  secrets: {},
  config: {
    usesTableApi: true,
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: true,
};

const validConnector = {
  ...deprecatedConnector,
  config: { usesTableApi: false },
  isDeprecated: false,
};

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

  describe('getConnectorDescriptiveTitle', () => {
    it('adds deprecated to the connector name when the connector is deprectaed', () => {
      expect(getConnectorDescriptiveTitle(deprecatedConnector)).toEqual('Test (deprecated)');
    });

    it('does not add deprecated when the connector is not deprectaed', () => {
      expect(getConnectorDescriptiveTitle(validConnector)).toEqual('Test');
    });
  });

  describe('getSelectedConnectorIcon', () => {
    it('returns undefined when the connector is not deprectaed', () => {
      expect(getSelectedConnectorIcon(validConnector)).toBeUndefined();
    });

    it('returns a component when the connector is deprectaed', () => {
      expect(getSelectedConnectorIcon(deprecatedConnector)).toBeDefined();
    });
  });
});

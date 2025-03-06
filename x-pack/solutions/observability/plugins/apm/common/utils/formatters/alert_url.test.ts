/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertUrlErrorCount, getAlertUrlTransaction } from './alert_url';
describe('alert_url', () => {
  describe('getAlertUrlErrorCount', () => {
    it('return the URL where the service name is camelcase', () => {
      const url = getAlertUrlErrorCount('serviceName', 'serviceEnv');
      expect(url).toBe('/app/apm/services/serviceName/errors?environment=serviceEnv');
    });
    it('return the URL where the service name is sneak case', () => {
      const url = getAlertUrlErrorCount('service_name', 'serviceEnv');
      expect(url).toBe('/app/apm/services/service_name/errors?environment=serviceEnv');
    });
    it('return the URL encoded correctly where the service name has spaces', () => {
      const url = getAlertUrlErrorCount('service name', 'serviceEnv');
      expect(url).toBe('/app/apm/services/service%20name/errors?environment=serviceEnv');
    });
  });
  describe('getAlertUrlTransaction', () => {
    it('return the URL where the service name is camelcase', () => {
      const url = getAlertUrlTransaction('serviceName', 'serviceEnv', 'transactionType');
      expect(url).toBe(
        '/app/apm/services/serviceName?transactionType=transactionType&environment=serviceEnv'
      );
    });
    it('return the URL where the service name is sneak case', () => {
      const url = getAlertUrlTransaction('service_name', 'serviceEnv', 'transactionType');
      expect(url).toBe(
        '/app/apm/services/service_name?transactionType=transactionType&environment=serviceEnv'
      );
    });
    it('return the URL encoded correctly where the service name has spaces', () => {
      const url = getAlertUrlTransaction('service name', 'serviceEnv', 'transactionType');
      expect(url).toBe(
        '/app/apm/services/service%20name?transactionType=transactionType&environment=serviceEnv'
      );
    });
  });
});

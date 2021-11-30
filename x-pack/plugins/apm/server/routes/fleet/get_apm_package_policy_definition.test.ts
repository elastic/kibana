/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { preprocessLegacyFields } from './get_apm_package_policy_definition';

const apmServerSchema = {
  'apm-server.host': '0.0.0.0:8200',
  'apm-server.secret_token': 'asdfkjhasdf',
  'apm-server.api_key.enabled': true,
  'apm-server.read_timeout': 3600,
  'apm-server.rum.event_rate.limit': 100,
  'apm-server.rum.event_rate.lru_size': 100,
  'apm-server.rum.allow_service_names': 'opbeans-test',
  'logging.level': 'error',
  'queue.mem.events': 2000,
  'queue.mem.flush.timeout': '1s',
  'setup.template.settings.index.number_of_jshards': 1,
};

describe('get_apm_package_policy_definition', () => {
  describe('preprocessLegacyFields', () => {
    it('should replace legacy fields with supported fields', () => {
      const result = preprocessLegacyFields({ apmServerSchema });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "apm-server.auth.anonymous.allow_service": "opbeans-test",
          "apm-server.auth.anonymous.rate_limit.event_limit": 100,
          "apm-server.auth.anonymous.rate_limit.ip_limit": 100,
          "apm-server.auth.api_key.enabled": true,
          "apm-server.auth.secret_token": "asdfkjhasdf",
          "apm-server.host": "0.0.0.0:8200",
          "apm-server.read_timeout": 3600,
          "logging.level": "error",
          "queue.mem.events": 2000,
          "queue.mem.flush.timeout": "1s",
          "setup.template.settings.index.number_of_jshards": 1,
        }
      `);
    });
  });
});

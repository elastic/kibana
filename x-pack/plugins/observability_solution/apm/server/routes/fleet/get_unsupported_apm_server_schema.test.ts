/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { getUnsupportedApmServerSchema } from './get_unsupported_apm_server_schema';

const apmServerSchema = {
  'apm-server.host': '0.0.0.0:8200',
  'apm-server.secret_token': 'asdfkjhasdf',
  'apm-server.read_timeout': 3600,
  'apm-server.rum.event_rate.limit': 100,
  'apm-server.rum.event_rate.lru_size': 100,
  'apm-server.rum.allow_service_names': 'opbeans-test',
  'logging.level': 'error',
  'queue.mem.events': 2000,
  'queue.mem.flush.timeout': '1s',
  'setup.template.settings.index.number_of_jshards': 1,
};

const mockSavaedObectsClient = {
  get: () => ({
    attributes: { schemaJson: JSON.stringify(apmServerSchema) },
  }),
} as unknown as SavedObjectsClientContract;

describe('get_unsupported_apm_server_schema', () => {
  describe('getUnsupportedApmServerSchema', () => {
    it('should return key-value pairs of unsupported configs', async () => {
      const result = await getUnsupportedApmServerSchema({
        savedObjectsClient: mockSavaedObectsClient,
      });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": "logging.level",
            "value": "error",
          },
          Object {
            "key": "queue.mem.events",
            "value": 2000,
          },
          Object {
            "key": "queue.mem.flush.timeout",
            "value": "1s",
          },
          Object {
            "key": "setup.template.settings.index.number_of_jshards",
            "value": 1,
          },
        ]
      `);
    });
  });
});

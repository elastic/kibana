/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TelemetryEventsSender } from './sender.ts';

describe('TelemetryEventsSender', () => {
  describe('processEvents', () => {
    it('returns empty array when empty array is passed', async () => {
      const sender = new TelemetryEventsSender();
      const result = sender.processEvents([]);
      expect(result).toStrictEqual([]);
    });

    it('applies the allowlist', () => {
      const sender = new TelemetryEventsSender();
      const input = [
        {
          event: {
            kind: 'alert',
            something_else: 'nope',
          },
          agent: {
            name: 'test',
          },
          file: {
            size: 3,
            path: 'X',
            test: 'me',
            another: 'nope',
            Ext: {
              code_signature: 'X',
              malware_classification: 'X',
              something_else: 'nope',
            },
          },
          host: {
            os: {
              name: 'windows',
            },
            something_else: 'nope',
          },
        },
      ];

      const result = sender.processEvents(input);
      expect(result).toStrictEqual([
        {
          event: {
            kind: 'alert',
          },
          agent: {
            name: 'test',
          },
          file: {
            size: 3,
            path: 'X',
            Ext: {
              code_signature: 'X',
              malware_classification: 'X',
            },
          },
          host: {
            os: {
              name: 'windows',
            },
          },
        },
      ]);
    });
  });
});

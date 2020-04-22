/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCertSummary } from '../tls';
import { Cert } from '../../../../../../legacy/plugins/uptime/common/runtime_types';

describe('tls alert', () => {
  describe('getCertSummary', () => {
    let mockCerts: Cert[];

    beforeEach(() => {
      mockCerts = [
        {
          certificate_not_valid_after: '2020-07-16T03:15:39.000Z',
          certificate_not_valid_before: '2019-07-24T03:15:39.000Z',
          common_name: 'Common-One',
          monitors: [{ name: 'monitor-one', id: 'monitor1' }],
          sha256: 'abc',
        },
        {
          certificate_not_valid_after: '2020-07-18T03:15:39.000Z',
          certificate_not_valid_before: '2019-07-20T03:15:39.000Z',
          common_name: 'Common-Two',
          monitors: [{ name: 'monitor-two', id: 'monitor2' }],
          sha256: 'bcd',
        },
        {
          certificate_not_valid_after: '2020-07-19T03:15:39.000Z',
          certificate_not_valid_before: '2019-07-22T03:15:39.000Z',
          common_name: 'Common-Three',
          monitors: [{ name: 'monitor-three', id: 'monitor3' }],
          sha256: 'cde',
        },
        {
          certificate_not_valid_after: '2020-07-25T03:15:39.000Z',
          certificate_not_valid_before: '2019-07-25T03:15:39.000Z',
          common_name: 'Common-Four',
          monitors: [{ name: 'monitor-four', id: 'monitor4' }],
          sha256: 'def',
        },
      ];
    });

    it('sorts expiring certs appropriately when creating summary', () => {
      const result = getCertSummary(
        mockCerts,
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "aging": Array [],
          "expiring": Array [
            Object {
              "certificate_not_valid_after": "2020-07-16T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-24T03:15:39.000Z",
              "common_name": "Common-One",
              "monitors": Array [
                Object {
                  "id": "monitor1",
                  "name": "monitor-one",
                },
              ],
              "sha256": "abc",
            },
            Object {
              "certificate_not_valid_after": "2020-07-18T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-20T03:15:39.000Z",
              "common_name": "Common-Two",
              "monitors": Array [
                Object {
                  "id": "monitor2",
                  "name": "monitor-two",
                },
              ],
              "sha256": "bcd",
            },
            Object {
              "certificate_not_valid_after": "2020-07-19T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-22T03:15:39.000Z",
              "common_name": "Common-Three",
              "monitors": Array [
                Object {
                  "id": "monitor3",
                  "name": "monitor-three",
                },
              ],
              "sha256": "cde",
            },
          ],
          "topAging": Array [],
          "topExpiring": Array [
            Object {
              "commonName": "Common-One",
              "validUntil": "2020-07-16T03:15:39.000Z",
            },
            Object {
              "commonName": "Common-Two",
              "validUntil": "2020-07-18T03:15:39.000Z",
            },
            Object {
              "commonName": "Common-Three",
              "validUntil": "2020-07-19T03:15:39.000Z",
            },
          ],
        }
      `);
    });

    it('sorts aging certs appropriate when creating summary', () => {
      const result = getCertSummary(
        mockCerts,
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "aging": Array [
            Object {
              "certificate_not_valid_after": "2020-07-18T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-20T03:15:39.000Z",
              "common_name": "Common-Two",
              "monitors": Array [
                Object {
                  "id": "monitor2",
                  "name": "monitor-two",
                },
              ],
              "sha256": "bcd",
            },
            Object {
              "certificate_not_valid_after": "2020-07-19T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-22T03:15:39.000Z",
              "common_name": "Common-Three",
              "monitors": Array [
                Object {
                  "id": "monitor3",
                  "name": "monitor-three",
                },
              ],
              "sha256": "cde",
            },
            Object {
              "certificate_not_valid_after": "2020-07-16T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-24T03:15:39.000Z",
              "common_name": "Common-One",
              "monitors": Array [
                Object {
                  "id": "monitor1",
                  "name": "monitor-one",
                },
              ],
              "sha256": "abc",
            },
            Object {
              "certificate_not_valid_after": "2020-07-25T03:15:39.000Z",
              "certificate_not_valid_before": "2019-07-25T03:15:39.000Z",
              "common_name": "Common-Four",
              "monitors": Array [
                Object {
                  "id": "monitor4",
                  "name": "monitor-four",
                },
              ],
              "sha256": "def",
            },
          ],
          "expiring": Array [],
          "topAging": Array [
            Object {
              "commonName": "Common-Two",
              "validAfter": "2019-07-20T03:15:39.000Z",
            },
            Object {
              "commonName": "Common-Three",
              "validAfter": "2019-07-22T03:15:39.000Z",
            },
            Object {
              "commonName": "Common-One",
              "validAfter": "2019-07-24T03:15:39.000Z",
            },
          ],
          "topExpiring": Array [],
        }
      `);
    });
  });
});

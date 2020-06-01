/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { getCertSummary } from '../tls';
import { Cert } from '../../../../common/runtime_types';

describe('tls alert', () => {
  describe('getCertSummary', () => {
    let mockCerts: Cert[];
    let diffSpy: jest.SpyInstance<any, unknown[]>;

    beforeEach(() => {
      diffSpy = jest.spyOn(moment.prototype, 'diff');
      mockCerts = [
        {
          not_after: '2020-07-16T03:15:39.000Z',
          not_before: '2019-07-24T03:15:39.000Z',
          common_name: 'Common-One',
          monitors: [{ name: 'monitor-one', id: 'monitor1' }],
          sha256: 'abc',
        },
        {
          not_after: '2020-07-18T03:15:39.000Z',
          not_before: '2019-07-20T03:15:39.000Z',
          common_name: 'Common-Two',
          monitors: [{ name: 'monitor-two', id: 'monitor2' }],
          sha256: 'bcd',
        },
        {
          not_after: '2020-07-19T03:15:39.000Z',
          not_before: '2019-07-22T03:15:39.000Z',
          common_name: 'Common-Three',
          monitors: [{ name: 'monitor-three', id: 'monitor3' }],
          sha256: 'cde',
        },
        {
          not_after: '2020-07-25T03:15:39.000Z',
          not_before: '2019-07-25T03:15:39.000Z',
          common_name: 'Common-Four',
          monitors: [{ name: 'monitor-four', id: 'monitor4' }],
          sha256: 'def',
        },
      ];
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('sorts expiring certs appropriately when creating summary', () => {
      diffSpy.mockReturnValueOnce(900).mockReturnValueOnce(901).mockReturnValueOnce(902);
      const result = getCertSummary(
        mockCerts,
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "",
          "agingCount": 0,
          "count": 4,
          "expiringCommonNameAndDate": "Common-One, expired on 2020-07-16T03:15:39.000Z 900 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 901 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 902 days ago.",
          "expiringCount": 3,
          "hasAging": null,
          "hasExpired": true,
        }
      `);
    });

    it('sorts aging certs appropriate when creating summary', () => {
      diffSpy.mockReturnValueOnce(702).mockReturnValueOnce(701).mockReturnValueOnce(700);
      const result = getCertSummary(
        mockCerts,
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "Common-Two, valid since 2019-07-20T03:15:39.000Z, 702 days ago.; Common-Three, valid since 2019-07-22T03:15:39.000Z, 701 days ago.; Common-One, valid since 2019-07-24T03:15:39.000Z, 700 days ago.",
          "agingCount": 4,
          "count": 4,
          "expiringCommonNameAndDate": "",
          "expiringCount": 0,
          "hasAging": true,
          "hasExpired": null,
        }
      `);
    });

    it('handles negative diff values appropriately for aging certs', () => {
      diffSpy.mockReturnValueOnce(700).mockReturnValueOnce(-90).mockReturnValueOnce(-80);
      const result = getCertSummary(
        mockCerts,
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "Common-Two, valid since 2019-07-20T03:15:39.000Z, 700 days ago.; Common-Three, invalid until 2019-07-22T03:15:39.000Z, 90 days from now.; Common-One, invalid until 2019-07-24T03:15:39.000Z, 80 days from now.",
          "agingCount": 4,
          "count": 4,
          "expiringCommonNameAndDate": "",
          "expiringCount": 0,
          "hasAging": true,
          "hasExpired": null,
        }
      `);
    });

    it('handles negative diff values appropriately for expiring certs', () => {
      diffSpy
        // negative days are in the future, positive days are in the past
        .mockReturnValueOnce(-96)
        .mockReturnValueOnce(-94)
        .mockReturnValueOnce(2);
      const result = getCertSummary(
        mockCerts,
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "",
          "agingCount": 0,
          "count": 4,
          "expiringCommonNameAndDate": "Common-One, expires on 2020-07-16T03:15:39.000Z in 96 days.; Common-Two, expires on 2020-07-18T03:15:39.000Z in 94 days.; Common-Three, expired on 2020-07-19T03:15:39.000Z 2 days ago.",
          "expiringCount": 3,
          "hasAging": null,
          "hasExpired": true,
        }
      `);
    });
  });
});

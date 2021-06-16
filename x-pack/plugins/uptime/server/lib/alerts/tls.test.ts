/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getCertSummary } from './tls';
import { Cert } from '../../../common/runtime_types';

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
          issuer: 'Cloudflare Inc ECC CA-3',
        },
        {
          not_after: '2020-07-18T03:15:39.000Z',
          not_before: '2019-07-20T03:15:39.000Z',
          common_name: 'Common-Two',
          monitors: [{ name: 'monitor-two', id: 'monitor2' }],
          sha256: 'bcd',
          issuer: 'Cloudflare Inc ECC CA-3',
        },
        {
          not_after: '2020-07-19T03:15:39.000Z',
          not_before: '2019-07-22T03:15:39.000Z',
          common_name: 'Common-Three',
          monitors: [{ name: 'monitor-three', id: 'monitor3' }],
          sha256: 'cde',
          issuer: 'Cloudflare Inc ECC CA-3',
        },
        {
          not_after: '2020-07-25T03:15:39.000Z',
          not_before: '2019-07-25T03:15:39.000Z',
          common_name: 'Common-Four',
          monitors: [{ name: 'monitor-four', id: 'monitor4' }],
          sha256: 'def',
          issuer: 'Cloudflare Inc ECC CA-3',
        },
      ];
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('handles positive diffs for expired certs appropriately', () => {
      diffSpy.mockReturnValueOnce(900);
      const result = getCertSummary(
        mockCerts[0],
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCerts[0].common_name,
        issuer: mockCerts[0].issuer,

        summary: 'expired on 2020-07-16T03:15:39.000Z 900 days ago.',
      });
    });

    it('handles positive diffs for agining certs appropriately', () => {
      diffSpy.mockReturnValueOnce(702);
      const result = getCertSummary(
        mockCerts[0],
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCerts[0].common_name,
        issuer: mockCerts[0].issuer,
        summary: 'valid since 2019-07-24T03:15:39.000Z, 702 days ago.',
      });
    });

    it('handles negative diff values appropriately for aging certs', () => {
      diffSpy.mockReturnValueOnce(-90);
      const result = getCertSummary(
        mockCerts[0],
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCerts[0].common_name,
        issuer: mockCerts[0].issuer,

        summary: 'invalid until 2019-07-24T03:15:39.000Z, 90 days from now.',
      });
    });

    it('handles negative diff values appropriately for expiring certs', () => {
      diffSpy
        // negative days are in the future, positive days are in the past
        .mockReturnValueOnce(-96);
      const result = getCertSummary(
        mockCerts[0],
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCerts[0].common_name,
        issuer: mockCerts[0].issuer,

        summary: 'expires on 2020-07-16T03:15:39.000Z in 96 days.',
      });
    });
  });
});

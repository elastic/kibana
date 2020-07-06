/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { CloudDetector } from '../cloud_detector';

describe('CloudDetector', () => {
  const cloudService1 = {
    checkIfService: () => {
      return { isConfirmed: () => false };
    },
  };
  const cloudService2 = {
    checkIfService: () => {
      throw new Error('test: ignore this service');
    },
  };
  const cloudService3 = {
    checkIfService: () => {
      return {
        isConfirmed: () => true,
        toJSON: () => {
          return { name: 'good-match' };
        },
      };
    },
  };
  // this service is theoretically a better match for the current server, but order dictates that it should
  // never be checked (at least until we have some sort of "confidence" metric returned, if we ever run into this problem)
  const cloudService4 = {
    checkIfService: () => {
      return {
        isConfirmed: () => true,
        toJSON: () => {
          return { name: 'better-match' };
        },
      };
    },
  };
  const cloudServices = [cloudService1, cloudService2, cloudService3, cloudService4];

  describe('getCloudDetails', () => {
    it('returns undefined by default', () => {
      const detector = new CloudDetector();

      expect(detector.getCloudDetails()).to.be(undefined);
    });
  });

  describe('detectCloudService', () => {
    it('awaits _getCloudService', async () => {
      const detector = new CloudDetector({ cloudServices });

      expect(detector.getCloudDetails()).to.be(undefined);
      await detector.detectCloudService();
      expect(detector.getCloudDetails()).to.eql({ name: 'good-match' });
    });
  });

  describe('_getCloudService', () => {
    it('returns first match', async () => {
      const detector = new CloudDetector();

      // note: should never use better-match
      expect(await detector._getCloudService(cloudServices)).to.eql({ name: 'good-match' });
    });

    it('returns undefined if none match', async () => {
      const detector = new CloudDetector();

      expect(await detector._getCloudService([cloudService1, cloudService2])).to.be(undefined);
      expect(await detector._getCloudService([])).to.be(undefined);
    });

    // this is already tested above, but this just tests it explicitly
    it('ignores exceptions from cloud services', async () => {
      const detector = new CloudDetector();

      expect(await detector._getCloudService([cloudService2])).to.be(undefined);
    });
  });
});

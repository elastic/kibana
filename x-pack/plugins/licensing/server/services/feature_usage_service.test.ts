/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureUsageService } from './feature_usage_service';

describe('FeatureUsageService', () => {
  let service: FeatureUsageService;

  beforeEach(() => {
    service = new FeatureUsageService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('#setup', () => {
    describe('#register', () => {
      it('throws when registering the same feature twice', () => {
        const setup = service.setup();
        setup.register('foo', 'basic');
        expect(() => {
          setup.register('foo', 'basic');
        }).toThrowErrorMatchingInlineSnapshot(`"Feature 'foo' has already been registered."`);
      });
    });
  });

  describe('#start', () => {
    describe('#notifyUsage', () => {
      it('allows to notify a feature usage', () => {
        const setup = service.setup();
        setup.register('feature', 'basic');
        const start = service.start();
        start.notifyUsage('feature', 127001);

        expect(start.getLastUsages()).toEqual([
          {
            lastUsed: new Date(127001),
            licenseType: 'basic',
            name: 'feature',
          },
        ]);
      });

      it('can receive a Date object', () => {
        const setup = service.setup();
        setup.register('feature', 'basic');
        const start = service.start();

        const usageTime = new Date(2015, 9, 21, 17, 54, 12);
        start.notifyUsage('feature', usageTime);
        expect(start.getLastUsages()).toEqual([
          {
            lastUsed: usageTime,
            licenseType: 'basic',
            name: 'feature',
          },
        ]);
      });

      it('uses the current time when `usedAt` is unspecified', () => {
        jest.spyOn(Date, 'now').mockReturnValue(42);

        const setup = service.setup();
        setup.register('feature', 'basic');
        const start = service.start();
        start.notifyUsage('feature');

        expect(start.getLastUsages()).toEqual([
          {
            lastUsed: new Date(42),
            licenseType: 'basic',
            name: 'feature',
          },
        ]);
      });

      it('throws when notifying for an unregistered feature', () => {
        service.setup();
        const start = service.start();
        expect(() => {
          start.notifyUsage('unregistered');
        }).toThrowErrorMatchingInlineSnapshot(`"Feature 'unregistered' is not registered."`);
      });
    });

    describe('#getLastUsages', () => {
      it('returns the last usage for all used features', () => {
        const setup = service.setup();
        setup.register('featureA', 'basic');
        setup.register('featureB', 'gold');
        const start = service.start();
        start.notifyUsage('featureA', 127001);
        start.notifyUsage('featureB', 6666);

        expect(start.getLastUsages()).toEqual([
          { lastUsed: new Date(127001), licenseType: 'basic', name: 'featureA' },
          { lastUsed: new Date(6666), licenseType: 'gold', name: 'featureB' },
        ]);
      });

      it('returns the last usage even after notifying for an older usage', () => {
        const setup = service.setup();
        setup.register('featureA', 'basic');
        const start = service.start();
        start.notifyUsage('featureA', 1000);
        start.notifyUsage('featureA', 500);

        expect(start.getLastUsages()).toEqual([
          { lastUsed: new Date(1000), licenseType: 'basic', name: 'featureA' },
        ]);
      });

      it('returns entries for unused registered features', () => {
        const setup = service.setup();
        setup.register('featureA', 'basic');
        setup.register('featureB', 'gold');
        const start = service.start();
        start.notifyUsage('featureA', 127001);

        expect(start.getLastUsages()).toEqual([
          { lastUsed: new Date(127001), licenseType: 'basic', name: 'featureA' },
          { lastUsed: null, licenseType: 'gold', name: 'featureB' },
        ]);
      });
    });
  });
});

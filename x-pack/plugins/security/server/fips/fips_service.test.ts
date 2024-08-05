/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockGetFipsFn = jest.fn();
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  constants: jest.requireActual('crypto').constants,
  createHash: jest.requireActual('crypto').createHash,
  get getFips() {
    return mockGetFipsFn;
  },
}));

import type { Observable } from 'rxjs';
import { BehaviorSubject, of } from 'rxjs';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import type { SecurityLicenseFeatures } from '@kbn/security-plugin-types-common';

import type { FipsServiceSetupInternal, FipsServiceSetupParams } from './fips_service';
import { FipsService } from './fips_service';
import { licenseMock } from '../../common/licensing/index.mock';
import { ConfigSchema, createConfig } from '../config';

const logger = loggingSystemMock.createLogger();

function buildMockFipsServiceSetupParams(
  licenseType: LicenseType,
  isFipsConfigured: boolean,
  features$: Observable<Partial<SecurityLicenseFeatures>>,
  isAvailable: Observable<boolean> = of(true)
): FipsServiceSetupParams {
  mockGetFipsFn.mockImplementationOnce(() => {
    return isFipsConfigured ? 1 : 0;
  });

  const license = licenseMock.create(features$, licenseType, isAvailable);

  let mockConfig = {};
  if (isFipsConfigured) {
    mockConfig = { experimental: { fipsMode: { enabled: true } } };
  }

  return {
    license,
    config: createConfig(ConfigSchema.validate(mockConfig), loggingSystemMock.createLogger(), {
      isTLSEnabled: false,
    }),
  };
}

describe('FipsService', () => {
  let fipsService: FipsService;
  let fipsServiceSetup: FipsServiceSetupInternal;

  beforeEach(() => {
    fipsService = new FipsService(logger);
    logger.error.mockClear();
  });

  afterEach(() => {
    logger.error.mockClear();
  });

  describe('setup()', () => {
    it('should expose correct setup contract', () => {
      fipsService = new FipsService(logger);
      fipsServiceSetup = fipsService.setup(
        buildMockFipsServiceSetupParams('platinum', true, of({ allowFips: true }))
      );

      expect(fipsServiceSetup).toMatchInlineSnapshot(`
        Object {
          "validateLicenseForFips": [Function],
        }
      `);
    });
  });

  describe('#validateLicenseForFips', () => {
    describe('start-up check', () => {
      it('should not throw Error/log.error if license features allowFips and `experimental.fipsMode.enabled` is `false`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('platinum', false, of({ allowFips: true }))
        );
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.error).not.toHaveBeenCalled();
      });

      it('should not throw Error/log.error if license features allowFips and `experimental.fipsMode.enabled` is `true`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('platinum', true, of({ allowFips: true }))
        );
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.error).not.toHaveBeenCalled();
      });

      it('should not throw Error/log.error if license features do not allowFips and `experimental.fipsMode.enabled` is `false`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('basic', false, of({ allowFips: false }))
        );
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.error).not.toHaveBeenCalled();
      });

      it('should throw Error/log.error if license features do not allowFips and `experimental.fipsMode.enabled` is `true`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('basic', true, of({ allowFips: false }))
        );

        // Because the Error is thrown from within a SafeSubscriber and cannot be hooked into
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('monitoring check', () => {
      describe('with experimental.fipsMode.enabled', () => {
        let mockFeaturesSubject: BehaviorSubject<Partial<SecurityLicenseFeatures>>;
        let mockIsAvailableSubject: BehaviorSubject<boolean>;
        let mockFeatures$: Observable<Partial<SecurityLicenseFeatures>>;
        let mockIsAvailable$: Observable<boolean>;

        beforeAll(() => {
          mockFeaturesSubject = new BehaviorSubject<Partial<SecurityLicenseFeatures>>({
            allowFips: true,
          });
          mockIsAvailableSubject = new BehaviorSubject<boolean>(true);
          mockFeatures$ = mockFeaturesSubject.asObservable();
          mockIsAvailable$ = mockIsAvailableSubject.asObservable();
          fipsServiceSetup = fipsService.setup(
            buildMockFipsServiceSetupParams('platinum', true, mockFeatures$, mockIsAvailable$)
          );

          fipsServiceSetup.validateLicenseForFips();
        });

        beforeEach(() => {
          mockFeaturesSubject.next({ allowFips: true });
          mockIsAvailableSubject.next(true);
        });

        it('should not log.error if license changes to unavailable and `experimental.fipsMode.enabled` is `true`', () => {
          mockIsAvailableSubject.next(false);
          expect(logger.error).not.toHaveBeenCalled();
        });

        it('should not log.error if license features continue to allowFips and `experimental.fipsMode.enabled` is `true`', () => {
          mockFeaturesSubject.next({ allowFips: true });
          expect(logger.error).not.toHaveBeenCalled();
        });

        it('should log.error if license features change to not allowFips and `experimental.fipsMode.enabled` is `true`', () => {
          mockFeaturesSubject.next({ allowFips: false });
          expect(logger.error).toHaveBeenCalledTimes(1);
        });
      });

      describe('with not experimental.fipsMode.enabled', () => {
        let mockFeaturesSubject: BehaviorSubject<Partial<SecurityLicenseFeatures>>;
        let mockIsAvailableSubject: BehaviorSubject<boolean>;
        let mockFeatures$: Observable<Partial<SecurityLicenseFeatures>>;
        let mockIsAvailable$: Observable<boolean>;

        beforeAll(() => {
          mockFeaturesSubject = new BehaviorSubject<Partial<SecurityLicenseFeatures>>({
            allowFips: true,
          });
          mockIsAvailableSubject = new BehaviorSubject<boolean>(true);
          mockFeatures$ = mockFeaturesSubject.asObservable();
          mockIsAvailable$ = mockIsAvailableSubject.asObservable();

          fipsServiceSetup = fipsService.setup(
            buildMockFipsServiceSetupParams('platinum', false, mockFeatures$, mockIsAvailable$)
          );

          fipsServiceSetup.validateLicenseForFips();
        });

        beforeEach(() => {
          mockFeaturesSubject.next({ allowFips: true });
          mockIsAvailableSubject.next(true);
        });

        it('should not log.error if license changes to unavailable and `experimental.fipsMode.enabled` is `false`', () => {
          mockIsAvailableSubject.next(false);
          expect(logger.error).not.toHaveBeenCalled();
        });

        it('should not log.error if license features continue to allowFips and `experimental.fipsMode.enabled` is `false`', () => {
          mockFeaturesSubject.next({ allowFips: true });
          expect(logger.error).not.toHaveBeenCalled();
        });

        it('should not log.error if license change to not allowFips and `experimental.fipsMode.enabled` is `false`', () => {
          mockFeaturesSubject.next({ allowFips: false });
          expect(logger.error).not.toHaveBeenCalled();
        });
      });
    });
  });
});

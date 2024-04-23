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
    mockConfig = { fipsMode: { enabled: true } };
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

  beforeAll(() => {
    fipsService = new FipsService(logger);
  });

  beforeEach(() => {
    logger.fatal.mockClear();
  });

  afterEach(() => {
    logger.fatal.mockClear();
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
      it('should not throw Error/log.fatal if license features allowFips and `fipsMode.enabled` is `false`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('platinum', false, of({ allowFips: true }))
        );
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.fatal).not.toHaveBeenCalled();
      });

      it('should not throw Error/log.fatal if license features allowFips and `fipsMode.enabled` is `true`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('platinum', true, of({ allowFips: true }))
        );
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.fatal).not.toHaveBeenCalled();
      });

      it('should not throw Error/log.fatal if license features do not allowFips and `fipsMode.enabled` is `false`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('basic', false, of({}))
        );
        fipsServiceSetup.validateLicenseForFips();

        expect(logger.fatal).not.toHaveBeenCalled();
      });

      it('should throw Error/log.fatal if license features do not allowFips and `fipsMode.enabled` is `true`', () => {
        fipsServiceSetup = fipsService.setup(
          buildMockFipsServiceSetupParams('basic', true, of({}))
        );

        expect(() => {
          fipsServiceSetup.validateLicenseForFips();
        }).toThrowError();
        expect(logger.fatal).toHaveBeenCalledTimes(1);
      });
    });

    describe('monitoring check', () => {
      describe('with fipsMode.enabled', () => {
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

        it('should not log.fatal if license changes to unavailable and `fipsMode.enabled` is `true`', () => {
          mockIsAvailableSubject.next(false);
          expect(logger.fatal).not.toHaveBeenCalled();
        });

        it('should not log.fatal if license features continue to allowFips and `fipsMode.enabled` is `true`', () => {
          mockFeaturesSubject.next({ allowFips: true });
          expect(logger.fatal).not.toHaveBeenCalled();
        });

        it('should log.fatal if license features change to not allowFips and `fipsMode.enabled` is `true`', () => {
          mockFeaturesSubject.next({});
          expect(logger.fatal).toHaveBeenCalledTimes(1);
        });
      });

      describe('with not fipsMode.enabled', () => {
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

        it('should not log.fatal if license changes to unavailable and `fipsMode.enabled` is `false`', () => {
          mockIsAvailableSubject.next(false);
          expect(logger.fatal).not.toHaveBeenCalled();
        });

        it('should not log.fatal if license features continue to allowFips and `fipsMode.enabled` is `false`', () => {
          mockFeaturesSubject.next({ allowFips: true });
          expect(logger.fatal).not.toHaveBeenCalled();
        });

        it('should not log.fatal if license change to not allowFips and `fipsMode.enabled` is `false`', () => {
          console.log('Test');
          mockFeaturesSubject.next({});
          expect(logger.fatal).not.toHaveBeenCalled();
        });
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { License } from '@kbn/licensing-plugin/common/license';
import { licenseMock as licensingMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ILicense } from '@kbn/licensing-plugin/common/types';

import type {
  FipsServiceSetupInternal,
  FipsServiceSetupParams,
  FipsServiceStartInternal,
  FipsServiceStartParams,
} from './fips_service';
import { FipsService } from './fips_service';
import { licenseMock } from '../../common/licensing/index.mock';
import { ConfigSchema, createConfig } from '../config';

const logger = loggingSystemMock.createLogger();

describe('FipsService', () => {
  const mockFipsSetupParams: FipsServiceSetupParams = {
    license: licenseMock.create(),
    config: createConfig(
      ConfigSchema.validate({ fipsMode: { enabled: true } }),
      loggingSystemMock.createLogger(),
      {
        isTLSEnabled: false,
      }
    ),
  };

  const license = licensingMock.createLicenseMock();
  const licenseSubject = new BehaviorSubject<ILicense>(license);
  const license$ = licenseSubject.asObservable();

  const mockFipsStartParams: FipsServiceStartParams = {
    license$,
  };

  let fipsService: FipsService;
  let fipsServiceSetup: FipsServiceSetupInternal;
  let fipsServiceStart: FipsServiceStartInternal;

  beforeEach(() => {
    fipsService = new FipsService(logger);
  });

  afterEach(() => {
    logger.fatal.mockClear();
  });

  // describe('', () => {});

  describe('setup()', () => {
    it('should expose correct setup contract', () => {
      fipsServiceSetup = fipsService.setup(mockFipsSetupParams);

      expect(fipsServiceSetup).toMatchInlineSnapshot(`
        Object {
          "canStartInFipsMode": [Function],
        }
      `);
    });
  });

  describe('start()', () => {
    it('should expose correct start contract', () => {
      fipsService.setup(mockFipsSetupParams);
      fipsServiceStart = fipsService.start(mockFipsStartParams);

      expect(fipsServiceStart).toMatchInlineSnapshot(`
      Object {
        "monitorForLicenseDowngradeToLogFipsRestartError": [Function],
      }
    `);
    });
  });

  describe('#canStartInFipsMode', () => {
    it('should not throw Error and log `fatal` if `fipsMode.enabled` is not `true` and license < platinum', () => {
      fipsServiceSetup = fipsService.setup({
        license: licenseMock.create({}, 'basic'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: false } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceSetup.canStartInFipsMode();

      expect(logger.fatal).not.toHaveBeenCalled();
    });

    it('should not throw Error and log `fatal` if `fipsMode.enabled` is not `true` and license >= platinum', () => {
      fipsServiceSetup = fipsService.setup({
        license: licenseMock.create({ allowFips: true }, 'platinum'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: false } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceSetup.canStartInFipsMode();

      expect(logger.fatal).not.toHaveBeenCalled();
    });

    it('should not throw Error and log `fatal` if `fipsMode.enabled` is `true` and license >= platinum', () => {
      fipsServiceSetup = fipsService.setup({
        license: licenseMock.create({ allowFips: true }, 'platinum'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: true } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceSetup.canStartInFipsMode();

      expect(logger.fatal).not.toHaveBeenCalled();
    });

    it('should throw Error and log `fatal` if `fipsMode.enabled` is `true` and license < platinum', () => {
      fipsServiceSetup = fipsService.setup({
        license: licenseMock.create({}),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: true } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      expect(() => fipsServiceSetup.canStartInFipsMode()).toThrowError();
      expect(logger.fatal).toHaveBeenCalled();
    });
  });

  describe('#monitorForLicenseDowngradeToLogFipsRestartError', () => {
    afterEach(() => {
      licenseSubject.next(license);
    });

    it('should not log `fatal` if license is not available', () => {
      fipsService.setup({
        license: licenseMock.create({ allowFips: true }, 'platinum'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: true } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceStart = fipsService.start({ license$ });

      const nextLicense = License.fromJSON({ signature: 'xyz' });
      licenseSubject.next(nextLicense);

      fipsServiceStart.monitorForLicenseDowngradeToLogFipsRestartError();

      expect(logger.fatal).not.toHaveBeenCalled();
    });

    it('should not log `fatal` if `fipsMode.enabled` is `false`', () => {
      fipsService.setup({
        license: licenseMock.create({}, 'basic'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: false } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceStart = fipsService.start({ license$ });

      const nextLicense = licensingMock.createLicense();
      licenseSubject.next(nextLicense);

      fipsServiceStart.monitorForLicenseDowngradeToLogFipsRestartError();

      expect(logger.fatal).not.toHaveBeenCalled();
    });

    it('should not log `fatal` if `fipsMode.enabled` is `true` and license >= platinum', () => {
      fipsService.setup({
        license: licenseMock.create({ allowFips: true }, 'platinum'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: true } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceStart = fipsService.start({ license$ });

      const nextLicense = licensingMock.createLicense({ license: { type: 'platinum' } });
      licenseSubject.next(nextLicense);

      fipsServiceStart.monitorForLicenseDowngradeToLogFipsRestartError();

      expect(logger.fatal).not.toHaveBeenCalled();
    });

    it('should log `fatal` if `fipsMode.enabled` is `true` and license < platinum', () => {
      fipsService.setup({
        license: licenseMock.create({ allowFips: false }, 'basic'),
        config: createConfig(
          ConfigSchema.validate({ fipsMode: { enabled: true } }),
          loggingSystemMock.createLogger(),
          {
            isTLSEnabled: false,
          }
        ),
      });

      fipsServiceStart = fipsService.start({ license$ });

      const nextLicense = licensingMock.createLicense({ license: { type: 'basic' } });
      licenseSubject.next(nextLicense);

      fipsServiceStart.monitorForLicenseDowngradeToLogFipsRestartError();

      expect(logger.fatal).toHaveBeenCalledTimes(1);
    });
  });
});

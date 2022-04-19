/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { License } from './license';
import { LicenseCheckState, licensingMock, LicenseType } from './shared_imports';

describe('License API guard', () => {
  const pluginName = 'testPlugin';

  const mockLicensingService = ({
    licenseType,
    licenseState,
  }: {
    licenseType: LicenseType;
    licenseState: LicenseCheckState;
  }) => {
    const licenseMock = licensingMock.createLicenseMock();
    licenseMock.type = licenseType;
    licenseMock.check('test', 'gold'); // Flush default mocked state
    licenseMock.check.mockReturnValue({ state: licenseState }); // Replace with new mocked state

    return {
      license$: of(licenseMock),
    };
  };

  const testRoute = ({
    licenseType,
    licenseState,
  }: {
    licenseType: LicenseType;
    licenseState: LicenseCheckState;
  }) => {
    const license = new License();

    const logger = {
      warn: jest.fn(),
    };

    license.setup({ pluginName, logger });
    const licensing = mockLicensingService({ licenseType, licenseState });

    license.start({
      pluginId: 'id',
      minimumLicenseType: 'gold',
      licensing,
    });

    const route = jest.fn();
    const guardedRoute = license.guardApiRoute(route);
    const forbidden = jest.fn();
    const responseMock = httpServerMock.createResponseFactory();
    responseMock.forbidden = forbidden;
    guardedRoute({} as RequestHandlerContext, {} as KibanaRequest, responseMock);

    return {
      errorResponse:
        forbidden.mock.calls.length > 0
          ? forbidden.mock.calls[forbidden.mock.calls.length - 1][0]
          : undefined,
      logMesssage:
        logger.warn.mock.calls.length > 0
          ? logger.warn.mock.calls[logger.warn.mock.calls.length - 1][0]
          : undefined,
      route,
    };
  };

  describe('basic minimum license', () => {
    it('is rejected', () => {
      const license = new License();
      license.setup({ pluginName, logger: {} as Logger });
      expect(() => {
        license.start({
          pluginId: pluginName,
          minimumLicenseType: 'basic',
          licensing: mockLicensingService({ licenseType: 'gold', licenseState: 'valid' }),
        });
      }).toThrowError(
        `Basic licenses don't restrict the use of plugins. Please don't use license_api_guard in the ${pluginName} plugin, or provide a more restrictive minimumLicenseType.`
      );
    });
  });

  describe('non-basic minimum license', () => {
    const licenseType = 'gold';

    describe('when valid', () => {
      it('the original route is called and nothing is logged', () => {
        const { errorResponse, logMesssage, route } = testRoute({
          licenseType,
          licenseState: 'valid',
        });

        expect(errorResponse).toBeUndefined();
        expect(logMesssage).toBeUndefined();
        expect(route).toHaveBeenCalled();
      });
    });

    [
      {
        licenseState: 'invalid' as LicenseCheckState,
        expectedMessage: `Your ${licenseType} license does not support ${pluginName}. Please upgrade your license.`,
      },
      {
        licenseState: 'expired' as LicenseCheckState,
        expectedMessage: `You cannot use ${pluginName} because your ${licenseType} license has expired.`,
      },
      {
        licenseState: 'unavailable' as LicenseCheckState,
        expectedMessage: `You cannot use ${pluginName} because license information is not available at this time.`,
      },
    ].forEach(({ licenseState, expectedMessage }) => {
      describe(`when ${licenseState}`, () => {
        it('replies with and logs the error message', () => {
          const { errorResponse, logMesssage, route } = testRoute({ licenseType, licenseState });

          // We depend on the call to `response.forbidden()` to generate the 403 status code,
          // so we can't assert for it here.
          expect(errorResponse).toEqual({
            body: {
              message: expectedMessage,
            },
          });

          expect(logMesssage).toBe(expectedMessage);
          expect(route).not.toHaveBeenCalled();
        });
      });
    });
  });
});

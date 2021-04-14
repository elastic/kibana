/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { KibanaRequest, RequestHandlerContext } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { httpServerMock } from 'src/core/server/http/http_server.mocks';

import { License } from './license';
import { LicenseCheckState, licensingMock } from './shared_imports';

describe('License API guard', () => {
  const pluginName = 'testPlugin';
  const currentLicenseType = 'basic';

  const testRoute = ({ licenseState }: { licenseState: string }) => {
    const license = new License();

    const logger = {
      warn: jest.fn(),
    };

    license.setup({ pluginName, logger });

    const licenseMock = licensingMock.createLicenseMock();
    licenseMock.type = currentLicenseType;
    licenseMock.check('test', 'basic'); // Flush default mocked state
    licenseMock.check.mockReturnValue({ state: licenseState as LicenseCheckState }); // Replace with new mocked state

    const licensing = {
      license$: of(licenseMock),
    };

    license.start({
      pluginId: 'id',
      minimumLicenseType: 'basic',
      licensing,
    });

    const route = jest.fn();
    const guardedRoute = license.guardApiRoute(route);
    const customError = jest.fn();
    const responseMock = httpServerMock.createResponseFactory();
    responseMock.customError = customError;
    guardedRoute({} as RequestHandlerContext, {} as KibanaRequest, responseMock);

    return {
      errorResponse:
        customError.mock.calls.length > 0
          ? customError.mock.calls[customError.mock.calls.length - 1][0]
          : undefined,
      logMesssage:
        logger.warn.mock.calls.length > 0
          ? logger.warn.mock.calls[logger.warn.mock.calls.length - 1][0]
          : undefined,
      route,
    };
  };

  describe('valid license', () => {
    it('the original route is called and nothing is logged', () => {
      const { errorResponse, logMesssage, route } = testRoute({ licenseState: 'valid' });

      expect(errorResponse).toBeUndefined();
      expect(logMesssage).toBeUndefined();
      expect(route).toHaveBeenCalled();
    });
  });

  [
    {
      licenseState: 'invalid',
      expectedMessage: `Your ${currentLicenseType} license does not support ${pluginName}. Please upgrade your license.`,
    },
    {
      licenseState: 'expired',
      expectedMessage: `You cannot use ${pluginName} because your ${currentLicenseType} license has expired.`,
    },
    {
      licenseState: 'unavailable',
      expectedMessage: `You cannot use ${pluginName} because license information is not available at this time.`,
    },
  ].forEach(({ licenseState, expectedMessage }) => {
    describe(`${licenseState} license`, () => {
      it('replies with 403 and message and logs the message', () => {
        const { errorResponse, logMesssage, route } = testRoute({ licenseState });

        expect(errorResponse).toEqual({
          body: {
            message: expectedMessage,
          },
          statusCode: 403,
        });

        expect(logMesssage).toBe(expectedMessage);
        expect(route).not.toHaveBeenCalled();
      });
    });
  });
});

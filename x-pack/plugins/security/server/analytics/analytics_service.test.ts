/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { AnalyticsService, AUTHENTICATION_TYPE_EVENT_TYPE } from './analytics_service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let logger: jest.Mocked<Logger>;
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    service = new AnalyticsService(logger);
  });

  describe('#setup()', () => {
    const getSetupParams = () => {
      const mockCoreStart = coreMock.createSetup();
      return {
        analytics: mockCoreStart.analytics,
      };
    };

    it('returns proper contract', () => {
      const setupParams = getSetupParams();
      expect(service.setup(setupParams)).toEqual({
        reportAuthenticationTypeEvent: expect.any(Function),
      });
      expect(setupParams.analytics.registerEventType).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.registerEventType).toHaveBeenCalledWith({
        eventType: AUTHENTICATION_TYPE_EVENT_TYPE,
        schema: expect.objectContaining({
          authentication_provider_type: expect.anything(),
          authentication_realm_type: expect.anything(),
          http_authentication_scheme: expect.anything(),
        }),
      });
    });

    describe('#reportAuthenticationTypeEvent', () => {
      it('properly reports authentication event', async () => {
        const setupParams = getSetupParams();
        const analyticsSetup = service.setup(setupParams);

        analyticsSetup.reportAuthenticationTypeEvent({
          authenticationProviderType: 'Basic',
          authenticationRealmType: 'Native',
          httpAuthenticationScheme: 'Bearer',
        });

        expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
        expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
          AUTHENTICATION_TYPE_EVENT_TYPE,
          {
            authentication_provider_type: 'basic',
            authentication_realm_type: 'native',
            http_authentication_scheme: 'bearer',
          }
        );
      });
    });
  });
});

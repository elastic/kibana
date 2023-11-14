/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

import type { CSPViolationEvent, PermissionsPolicyViolationEvent } from './analytics_service';
import {
  AnalyticsService,
  AUTHENTICATION_TYPE_EVENT_TYPE,
  CSP_VIOLATION_EVENT_TYPE,
  PERMISSIONS_POLICY_VIOLATION_EVENT_TYPE,
} from './analytics_service';

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
      expect(service.setup(setupParams)).toMatchInlineSnapshot(`
        Object {
          "reportAuthenticationTypeEvent": [Function],
          "reportCSPViolation": [Function],
          "reportPermissionsPolicyViolation": [Function],
        }
      `);
      expect(setupParams.analytics.registerEventType).toHaveBeenCalledTimes(3);
      expect(setupParams.analytics.registerEventType).toHaveBeenCalledWith({
        eventType: AUTHENTICATION_TYPE_EVENT_TYPE,
        schema: expect.objectContaining({
          authentication_provider_type: expect.anything(),
          authentication_realm_type: expect.anything(),
          http_authentication_scheme: expect.anything(),
        }),
      });
      expect(setupParams.analytics.registerEventType).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: CSP_VIOLATION_EVENT_TYPE,
        })
      );
      expect(setupParams.analytics.registerEventType).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: PERMISSIONS_POLICY_VIOLATION_EVENT_TYPE,
        })
      );
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

    describe('#reportCSPViolation', () => {
      it('properly reports CSP violation event', async () => {
        const setupParams = getSetupParams();
        const analyticsSetup = service.setup(setupParams);

        const event = {} as CSPViolationEvent;
        analyticsSetup.reportCSPViolation(event);

        expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
        expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
          'security_csp_violation',
          event
        );
      });
    });

    describe('#reportPermissionsPolicyViolation', () => {
      it('properly reports Permissions policy violation event', async () => {
        const setupParams = getSetupParams();
        const analyticsSetup = service.setup(setupParams);

        const event = {} as PermissionsPolicyViolationEvent;
        analyticsSetup.reportPermissionsPolicyViolation(event);

        expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
        expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
          'security_permissions_policy_violation',
          event
        );
      });
    });
  });
});

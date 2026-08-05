/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import rison from '@kbn/rison';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../../common/environment_filter_values';
import { useAlertsHref } from './use_alerts_href';

const mockPrepend = jest.fn().mockImplementation((path: string) => path);

const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

function buildContext(
  overrides: {
    serviceName?: string;
    environment?: string;
    rangeFrom?: string;
    rangeTo?: string;
    canReadAlerts?: boolean;
  } = {}
) {
  const {
    serviceName = 'opbeans-java',
    environment = 'production',
    rangeFrom = 'now-15m',
    rangeTo = 'now',
    canReadAlerts = true,
  } = overrides;
  return {
    deps: {
      core: {
        http: { basePath: { prepend: mockPrepend } },
        application: { capabilities: { apm: { 'alerting:show': canReadAlerts } } },
      },
    },
    service: { name: serviceName },
    filters: { environment, rangeFrom, rangeTo },
  };
}

function renderAlertsHref(overrides: Parameters<typeof buildContext>[0] = {}) {
  mockUseServiceFlyoutContext.mockReturnValue(buildContext(overrides));
  return renderHook(() => useAlertsHref()).result.current;
}

function getKuery(href: string): string {
  const encoded = href.split('?_a=')[1];
  return (rison.decode(encoded) as any).kuery;
}

describe('useAlertsHref', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when the user lacks the alerting:show capability', () => {
    const href = renderAlertsHref({ canReadAlerts: false });
    expect(href).toBeUndefined();
  });

  it('includes the alerts base path', () => {
    const href = renderAlertsHref();
    expect(mockPrepend).toHaveBeenCalledWith('/app/observability/alerts');
    expect(href).toContain('/app/observability/alerts');
  });

  it('builds the kuery with only the service name when environment is ENVIRONMENT_ALL', () => {
    const href = renderAlertsHref({ environment: ENVIRONMENT_ALL_VALUE });
    expect(getKuery(href!)).toEqual('service.name: "opbeans-java"');
  });

  it('builds the kuery with a quoted environment clause for a specific environment', () => {
    const href = renderAlertsHref({ environment: 'production' });
    expect(getKuery(href!)).toEqual(
      'service.name: "opbeans-java" AND service.environment: "production"'
    );
  });

  it('builds the kuery with the OR clause for the not-defined sentinel', () => {
    const href = renderAlertsHref({ environment: ENVIRONMENT_NOT_DEFINED_VALUE });
    expect(getKuery(href!)).toEqual(
      'service.name: "opbeans-java" AND (service.environment: "ENVIRONMENT_NOT_DEFINED" OR NOT service.environment: *)'
    );
  });

  it('escapes double-quotes and backslashes in the service name', () => {
    const href = renderAlertsHref({ serviceName: 'my"service\\path' });
    expect(getKuery(href!)).toEqual(
      'service.name: "my\\"service\\\\path" AND service.environment: "production"'
    );
  });

  it('wires rangeFrom, rangeTo, and status:active into the encoded state', () => {
    const href = renderAlertsHref({ rangeFrom: 'now-1h', rangeTo: 'now' });
    const state = rison.decode(href!.split('?_a=')[1]) as any;
    expect(state.rangeFrom).toEqual('now-1h');
    expect(state.rangeTo).toEqual('now');
    expect(state.status).toEqual(ALERT_STATUS_ACTIVE);
  });
});

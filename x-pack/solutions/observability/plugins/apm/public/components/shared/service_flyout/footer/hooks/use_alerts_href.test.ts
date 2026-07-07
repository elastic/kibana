/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../../common/environment_filter_values';
import { useAlertsHref } from './use_alerts_href';

const mockCore = {
  http: { basePath: { prepend: (path: string) => path } },
} as any;

function renderAlertsHref(overrides: Partial<Parameters<typeof useAlertsHref>[0]> = {}) {
  return renderHook(() =>
    useAlertsHref({
      core: mockCore,
      serviceName: 'opbeans-java',
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      ...overrides,
    })
  ).result.current;
}

describe('useAlertsHref', () => {
  it('returns undefined when basePath.prepend returns falsy', () => {
    const href = renderAlertsHref({
      core: { http: { basePath: { prepend: () => undefined } } } as any,
    });
    expect(href).toBeUndefined();
  });

  it('includes the alerts path and service name', () => {
    const href = renderAlertsHref();
    expect(href).toContain('/app/observability/alerts');
    expect(href).toContain('opbeans-java');
  });

  it('omits the environment clause when environment is ENVIRONMENT_ALL', () => {
    const href = renderAlertsHref({ environment: ENVIRONMENT_ALL_VALUE });
    expect(href).not.toContain('service.environment');
  });

  it('includes the environment clause for a specific environment', () => {
    const href = renderAlertsHref({ environment: 'production' });
    expect(href).toContain('service.environment');
    expect(href).toContain('production');
  });

  it('includes ENVIRONMENT_NOT_DEFINED in the kuery for the not-defined sentinel', () => {
    const href = renderAlertsHref({ environment: ENVIRONMENT_NOT_DEFINED_VALUE });
    expect(href).toContain('service.environment');
    expect(href).toContain('ENVIRONMENT_NOT_DEFINED');
  });

  it('wires rangeFrom and rangeTo into the encoded state', () => {
    const href = renderAlertsHref({ rangeFrom: 'now-1h', rangeTo: 'now' });
    expect(href).toContain('now-1h');
    expect(href).toContain('now');
  });
});

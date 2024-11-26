/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { CasesContextFeatures } from '../../common/ui';
import { useCasesFeatures } from './use_cases_features';
import { TestProviders } from './mock/test_providers';
import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import { LICENSE_TYPE } from '@kbn/licensing-plugin/common/types';
import { CaseMetricsFeature } from '../../common/types/api';

describe('useCasesFeatures', () => {
  // isAlertsEnabled, isSyncAlertsEnabled, alerts
  const tests: Array<[boolean, boolean, CasesContextFeatures['alerts']]> = [
    [true, true, { enabled: true, sync: true }],
    [true, false, { enabled: true, sync: false }],
    [false, false, { enabled: false, sync: true }],
    [false, false, { enabled: false, sync: false }],
    [false, false, { enabled: false }],
    // the default for sync is true
    [true, true, { enabled: true }],
    // the default for enabled is true
    [true, true, { sync: true }],
    // the default for enabled is true
    [true, false, { sync: false }],
    // the default for enabled and sync is true
    [true, true, {}],
  ];

  it.each(tests)(
    'returns isAlertsEnabled=%s and isSyncAlertsEnabled=%s if feature.alerts=%s',
    async (isAlertsEnabled, isSyncAlertsEnabled, alerts) => {
      const { result } = renderHook(() => useCasesFeatures(), {
        wrapper: ({ children }) => <TestProviders features={{ alerts }}>{children}</TestProviders>,
      });

      expect(result.current).toEqual({
        isAlertsEnabled,
        isSyncAlertsEnabled,
        metricsFeatures: [],
        caseAssignmentAuthorized: false,
        pushToServiceAuthorized: false,
      });
    }
  );

  it('returns the metrics correctly', async () => {
    const { result } = renderHook(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ metrics: [CaseMetricsFeature.CONNECTORS] }}>
          {children}
        </TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: true,
      isSyncAlertsEnabled: true,
      metricsFeatures: [CaseMetricsFeature.CONNECTORS],
      caseAssignmentAuthorized: false,
      pushToServiceAuthorized: false,
    });
  });

  const licenseTests: Array<[LicenseType, boolean]> = (Object.keys(LICENSE_TYPE) as LicenseType[])
    .filter((type: LicenseType) => isNaN(Number(type)))
    .map((type) => [
      type,
      type === 'platinum' || type === 'enterprise' || type === 'trial' ? true : false,
    ]);

  it.each(licenseTests)(
    'allows platinum features on a platinum license',
    async (type, expectedResult) => {
      const license = licensingMock.createLicense({
        license: { type },
      });

      const { result } = renderHook(() => useCasesFeatures(), {
        wrapper: ({ children }) => <TestProviders license={license}>{children}</TestProviders>,
      });

      expect(result.current).toEqual({
        isAlertsEnabled: true,
        isSyncAlertsEnabled: true,
        metricsFeatures: [],
        caseAssignmentAuthorized: expectedResult,
        pushToServiceAuthorized: expectedResult,
      });
    }
  );
});

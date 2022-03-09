/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsPermissions, useGetUserAlertsPermissions } from './use_alert_permission';
import { applicationServiceMock } from 'src/core/public/mocks';
import { renderHook } from '@testing-library/react-hooks';

describe('getAlertsPermissions', () => {
  it('returns a fallback when featureId is nullish or missing from capabilities', () => {
    const { capabilities } = applicationServiceMock.createStartContract();

    expect(getAlertsPermissions(capabilities, '')).toEqual({
      crud: false,
      read: false,
      loading: false,
      featureId: '',
    });

    expect(getAlertsPermissions(capabilities, 'abc')).toEqual({
      crud: false,
      read: false,
      loading: false,
      featureId: 'abc',
    });
  });

  it('returns proper permissions when featureId is a key in capabilities', () => {
    const capabilities = Object.assign(
      {},
      applicationServiceMock.createStartContract().capabilities,
      {
        apm: { 'alerting:save': false, 'alerting:show': true, loading: true },
        uptime: { loading: true, save: true, show: true },
      }
    );

    expect(getAlertsPermissions(capabilities, 'uptime')).toEqual({
      crud: true,
      read: true,
      loading: false,
      featureId: 'uptime',
    });

    expect(getAlertsPermissions(capabilities, 'apm')).toEqual({
      crud: false,
      read: true,
      loading: false,
      featureId: 'apm',
    });
  });
});

describe('useGetUserAlertPermissions', function () {
  const timeout = 1_000;

  it(
    'updates permissions when featureId changes',
    async function () {
      const capabilities = Object.assign(
        {},
        applicationServiceMock.createStartContract().capabilities,
        {
          apm: { 'alerting:save': false, 'alerting:show': true },
          uptime: { save: true, show: true },
        }
      );

      const { result, rerender } = renderHook(
        ({ featureId }) => useGetUserAlertsPermissions(capabilities, featureId),
        {
          initialProps: { featureId: 'uptime' },
        }
      );
      expect(result.current.read).toBe(true);
      expect(result.current.crud).toBe(true);

      rerender({ featureId: 'apm' });
      expect(result.current.read).toBe(true);
      expect(result.current.crud).toBe(false);
    },
    timeout
  );

  it(
    'returns default permissions when permissions for featureId are missing',
    async function () {
      const { capabilities } = applicationServiceMock.createStartContract();

      const { result } = renderHook(
        ({ featureId }) => useGetUserAlertsPermissions(capabilities, featureId),
        {
          initialProps: { featureId: 'uptime' },
        }
      );
      expect(result.current).toEqual({
        crud: false,
        read: false,
        loading: false,
        featureId: null,
      });
    },
    timeout
  );
});

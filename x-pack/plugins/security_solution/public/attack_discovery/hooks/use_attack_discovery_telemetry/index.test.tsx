/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useAttackDiscoveryTelemetry } from '.';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';

const reportAttackDiscoveriesGenerated = jest.fn();
const mockedTelemetry = {
  ...createTelemetryServiceMock(),
  reportAttackDiscoveriesGenerated,
};

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('useAttackDiscoveryTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return the expected telemetry object with tracking functions', () => {
    const { result } = renderHook(() => useAttackDiscoveryTelemetry());
    expect(result.current).toHaveProperty('reportAttackDiscoveriesGenerated');
  });

  it('Should call reportAttackDiscoveriesGenerated with appropriate actionTypeId when tracking is called', async () => {
    const { result } = renderHook(() => useAttackDiscoveryTelemetry());
    await result.current.reportAttackDiscoveriesGenerated({
      actionTypeId: '.gen-ai',
      model: 'gpt-4',
      durationMs: 8000,
      alertsCount: 20,
      alertsContextCount: 25,
      configuredAlertsCount: 30,
    });
    expect(reportAttackDiscoveriesGenerated).toHaveBeenCalledWith({
      actionTypeId: '.gen-ai',
      model: 'gpt-4',
      durationMs: 8000,
      alertsCount: 20,
      alertsContextCount: 25,
      configuredAlertsCount: 30,
    });
  });
});

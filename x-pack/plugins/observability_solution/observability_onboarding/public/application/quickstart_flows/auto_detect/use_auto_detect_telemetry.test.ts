/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAutoDetectTelemetry } from './use_auto_detect_telemetry';
import { ObservabilityOnboardingFlowStatus } from './get_onboarding_status';
import { OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT } from '../../../../common/telemetry_events';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

describe('useAutoDetectTelemetry', () => {
  let reportEventMock: any;

  beforeEach(() => {
    reportEventMock = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        analytics: {
          reportEvent: reportEventMock,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`should report "awaiting_data" event when status is "awaitingData"`, () => {
    const expectedIntegration = {
      installSource: 'source1',
      pkgName: 'pkgName1',
      pkgVersion: 'pkgVersion1',
      title: 'title',
    };
    renderHook(() => useAutoDetectTelemetry('awaitingData', [expectedIntegration]));

    expect(reportEventMock).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT.eventType,
      {
        uses_legacy_onboarding_page: false,
        flow: 'auto_detect',
        step: 'awaiting_data',
        integrations: [expectedIntegration],
      }
    );
  });

  it(`should report "data_shipped" event when status is "dataReceived"`, () => {
    const expectedIntegration = {
      installSource: 'source2',
      pkgName: 'pkgName2',
      pkgVersion: 'pkgVersion2',
      title: 'title2',
    };
    renderHook(() => useAutoDetectTelemetry('dataReceived', [expectedIntegration]));

    // The effect runs after initial render
    expect(reportEventMock).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT.eventType,
      {
        uses_legacy_onboarding_page: false,
        flow: 'auto_detect',
        step: 'data_shipped',
        integrations: [expectedIntegration],
      }
    );
  });

  it('should not report the same event more than once', () => {
    const expectedIntegration = {
      installSource: 'source1',
      pkgName: 'pkgName1',
      pkgVersion: 'pkgVersion1',
      title: 'title',
    };
    const { rerender } = renderHook(
      ({ status }: { status: ObservabilityOnboardingFlowStatus }) =>
        useAutoDetectTelemetry(status, [expectedIntegration]),
      { initialProps: { status: 'awaitingData' } }
    );

    expect(reportEventMock).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT.eventType,
      {
        uses_legacy_onboarding_page: false,
        flow: 'auto_detect',
        step: 'awaiting_data',
        integrations: [expectedIntegration],
      }
    );

    rerender({ status: 'awaitingData' });
    expect(reportEventMock).toHaveBeenCalledTimes(1);

    rerender({ status: 'dataReceived' });
    expect(reportEventMock).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT.eventType,
      {
        uses_legacy_onboarding_page: false,
        flow: 'auto_detect',
        step: 'data_shipped',
        integrations: [expectedIntegration],
      }
    );
    expect(reportEventMock).toHaveBeenCalledTimes(2);
  });
});

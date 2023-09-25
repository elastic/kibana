/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { act, renderHook } from '@testing-library/react-hooks';
import { useAlertDataView, UserAlertDataView } from './use_alert_data_view';

const mockUseKibanaReturnValue = createStartServicesMock();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

describe('useAlertDataView', () => {
  const observabilityAlertFeatureIds: ValidFeatureId[] = [
    AlertConsumers.APM,
    AlertConsumers.INFRASTRUCTURE,
    AlertConsumers.LOGS,
    AlertConsumers.UPTIME,
  ];

  beforeEach(() => {
    mockUseKibanaReturnValue.http.get = jest.fn().mockReturnValue({
      index_name: [
        '.alerts-observability.uptime.alerts-*',
        '.alerts-observability.metrics.alerts-*',
        '.alerts-observability.logs.alerts-*',
        '.alerts-observability.apm.alerts-*',
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially is loading and does not have data', async () => {
    await act(async () => {
      const mockedAsyncDataView = {
        loading: true,
        error: undefined,
      };

      const { result, waitForNextUpdate } = renderHook<ValidFeatureId[], UserAlertDataView>(() =>
        useAlertDataView(observabilityAlertFeatureIds)
      );

      await waitForNextUpdate();

      expect(result.current).toEqual(mockedAsyncDataView);
    });
  });

  it('returns dataView for the provided featureIds', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<ValidFeatureId[], UserAlertDataView>(() =>
        useAlertDataView(observabilityAlertFeatureIds)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "error": undefined,
          "loading": false,
          "value": Array [
            Object {
              "fieldFormatMap": Object {},
              "fields": Array [],
              "title": ".alerts-observability.uptime.alerts-*,.alerts-observability.metrics.alerts-*,.alerts-observability.logs.alerts-*,.alerts-observability.apm.alerts-*",
            },
          ],
        }
      `);
    });
  });

  it('returns error with no data when error happens', async () => {
    const error = new Error('http error');
    mockUseKibanaReturnValue.http.get = jest.fn().mockImplementation(async () => {
      throw error;
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<ValidFeatureId[], UserAlertDataView>(() =>
        useAlertDataView(observabilityAlertFeatureIds)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "error": [Error: http error],
          "loading": false,
          "value": undefined,
        }
      `);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { act, renderHook } from '@testing-library/react-hooks';
import { AsyncState } from 'react-use/lib/useAsync';
import { useAlertDataView } from './use_alert_data_view';

const mockUseKibanaReturnValue = createStartServicesMock();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

describe('useAlertDataView', () => {
  const mockedDataView = 'dataView';
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
    mockUseKibanaReturnValue.data.dataViews.create = jest.fn().mockReturnValue(mockedDataView);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially is loading and does not have data', async () => {
    await act(async () => {
      const mockedAsyncDataView = {
        loading: true,
      };

      const { result, waitForNextUpdate } = renderHook<ValidFeatureId[], AsyncState<DataView>>(() =>
        useAlertDataView(observabilityAlertFeatureIds)
      );

      await waitForNextUpdate();

      expect(result.current).toEqual(mockedAsyncDataView);
    });
  });

  it('returns dataView for the provided featureIds', async () => {
    await act(async () => {
      const mockedAsyncDataView = {
        loading: false,
        value: mockedDataView,
      };

      const { result, waitForNextUpdate } = renderHook<ValidFeatureId[], AsyncState<DataView>>(() =>
        useAlertDataView(observabilityAlertFeatureIds)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual(mockedAsyncDataView);
    });
  });

  it('returns error with no data when error happens', async () => {
    const error = new Error('http error');
    mockUseKibanaReturnValue.http.get = jest.fn().mockImplementation(async () => {
      throw error;
    });

    await act(async () => {
      const mockedAsyncDataView = {
        loading: false,
        error,
      };

      const { result, waitForNextUpdate } = renderHook<ValidFeatureId[], AsyncState<DataView>>(() =>
        useAlertDataView(observabilityAlertFeatureIds)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual(mockedAsyncDataView);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDataView } from './use_data_view';
import { renderHook } from '@testing-library/react-hooks';
import { KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import { coreMock, notificationServiceMock } from '@kbn/core/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { InfraClientStartDeps } from '../../../../types';
import { CoreStart } from '@kbn/core/public';

jest.mock('@kbn/i18n');
jest.mock('@kbn/kibana-react-plugin/public');

let dataViewMock: jest.Mocked<DataViewsServicePublic>;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const notificationMock = notificationServiceMock.createStartContract();
const prop = { metricAlias: 'test' };

const mockUseKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      notifications: notificationMock,
      dataViews: dataViewMock,
    } as Partial<CoreStart> & Partial<InfraClientStartDeps>,
  } as unknown as KibanaReactContextValue<Partial<CoreStart> & Partial<InfraClientStartDeps>>);
};

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: 'mock-time-field-name',
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as jest.Mocked<DataView>;

describe('useHostTable hook', () => {
  beforeEach(() => {
    dataViewMock = {
      createAndSave: jest.fn(),
      find: jest.fn(),
    } as Partial<DataViewsServicePublic> as jest.Mocked<DataViewsServicePublic>;

    mockUseKibana();
  });

  it('should find an existing Data view', async () => {
    dataViewMock.find.mockReturnValue(Promise.resolve([mockDataView]));
    const { result, waitForNextUpdate } = renderHook(() => useDataView(prop));

    await waitForNextUpdate();
    expect(result.current.isDataViewLoading).toEqual(false);
    expect(result.current.hasFailedLoadingDataView).toEqual(false);
    expect(result.current.metricsDataView).toEqual(mockDataView);
  });

  it('should create a new Data view', async () => {
    dataViewMock.find.mockReturnValue(Promise.resolve([]));
    dataViewMock.createAndSave.mockReturnValue(Promise.resolve(mockDataView));
    const { result, waitForNextUpdate } = renderHook(() => useDataView(prop));

    await waitForNextUpdate();
    expect(result.current.isDataViewLoading).toEqual(false);
    expect(result.current.hasFailedLoadingDataView).toEqual(false);
    expect(result.current.metricsDataView).toEqual(mockDataView);
  });

  it('should display a toast when it fails to load the data view', async () => {
    dataViewMock.find.mockReturnValue(Promise.reject());
    const { result, waitForNextUpdate } = renderHook(() => useDataView(prop));

    await waitForNextUpdate();
    expect(result.current.isDataViewLoading).toEqual(false);
    expect(result.current.hasFailedLoadingDataView).toEqual(true);
    expect(result.current.metricsDataView).toBeUndefined();
    expect(notificationMock.toasts.addDanger).toBeCalledTimes(1);
  });
});

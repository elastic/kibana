/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDataView } from './use_data_view';
import { renderHook } from '@testing-library/react-hooks';
import { type KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import { coreMock, notificationServiceMock } from '@kbn/core/public/mocks';
import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { InfraClientStartDeps } from '../../../../types';
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

describe('useDataView hook', () => {
  beforeEach(() => {
    dataViewMock = {
      create: jest.fn(),
      find: jest.fn(),
    } as Partial<DataViewsServicePublic> as jest.Mocked<DataViewsServicePublic>;

    mockUseKibana();
  });

  it('should create a new ad-hoc data view', async () => {
    dataViewMock.create.mockReturnValue(Promise.resolve(mockDataView));
    const { result, waitForNextUpdate } = renderHook(() => useDataView(prop));

    await waitForNextUpdate();
    expect(result.current.loading).toEqual(false);
    expect(result.current.hasError).toEqual(false);
    expect(result.current.dataView).toEqual(mockDataView);
  });

  it('should display a toast when it fails to load the data view', async () => {
    dataViewMock.create.mockReturnValue(Promise.reject());
    const { result, waitForNextUpdate } = renderHook(() => useDataView(prop));

    await waitForNextUpdate();
    expect(result.current.loading).toEqual(false);
    expect(result.current.hasError).toEqual(true);
    expect(result.current.dataView).toBeUndefined();
    expect(notificationMock.toasts.addDanger).toBeCalledTimes(1);
  });

  it('should create a dataview with unique id for metricAlias metrics', async () => {
    const { waitForNextUpdate } = renderHook(() => useDataView({ metricAlias: 'metrics' }));

    await waitForNextUpdate();
    expect(dataViewMock.create).toHaveBeenCalledWith({
      id: 'infra_metrics_212933f0-c55e-5a36-8b13-e724aed2f66d',
      timeFieldName: '@timestamp',
      title: 'metrics',
    });
  });

  it('should create a dataview with unique id for metricAlias remote-metrics', async () => {
    const { waitForNextUpdate } = renderHook(() => useDataView({ metricAlias: 'remote-metrics' }));

    await waitForNextUpdate();
    expect(dataViewMock.create).toHaveBeenCalledWith({
      id: 'infra_metrics_e40bb657-0351-548e-8e73-093851d9bb6e',
      timeFieldName: '@timestamp',
      title: 'remote-metrics',
    });
  });
});

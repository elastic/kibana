/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { DeepPartial } from 'utility-types';
import type { MetricsExplorerResponse } from '../../../common/http_api/metrics_explorer';
import type { CoreProvidersProps } from '../../apps/common_providers';
import { MetricsDataClient } from '../../lib/metrics_client';

export type DataResponseMock = DeepPartial<MetricsExplorerResponse>;
export type NodeMetricsTableFetchMock = (
  path: string,
  options: HttpFetchOptions
) => Promise<DataResponseMock>;

export function createStartServicesAccessorMock() {
  const core = coreMock.createStart();
  core.i18n.Context.mockImplementation(I18nProvider as () => JSX.Element);

  const coreProvidersPropsMock: CoreProvidersProps = {
    core,
    theme$: core.theme.theme$,
  };
  const getStartServices = () => [coreProvidersPropsMock.core];

  return {
    coreProvidersPropsMock,
    fetch: core.http.fetch,
    getStartServices,
  };
}

export function createMetricsClientMock(metricsExplorerData: any) {
  return {
    metricsIndices: jest
      .fn()
      .mockResolvedValue({ metricIndices: 'metrics-*', metricIndicesExist: true }),
    metricsExplorer: jest.fn().mockResolvedValue(metricsExplorerData),
  } as unknown as MetricsDataClient;
}

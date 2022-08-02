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
import type { MetricsSourceConfigurationResponse } from '../../../common/metrics_sources';
import type { CoreProvidersProps } from '../../apps/common_providers';
import type {
  InfraClientStartDeps,
  InfraClientStartExports,
  InfraClientStartServices,
} from '../../types';

export type SourceResponseMock = DeepPartial<MetricsSourceConfigurationResponse>;
export type DataResponseMock = DeepPartial<MetricsExplorerResponse>;
export type NodeMetricsTableFetchMock = (
  path: string,
  options: HttpFetchOptions
) => Promise<SourceResponseMock | DataResponseMock>;

export function createStartServicesAccessorMock(fetchMock: NodeMetricsTableFetchMock) {
  const core = coreMock.createStart();
  // @ts-expect-error core.http.fetch has overloads, Jest/TypeScript only picks the first definition when mocking
  core.http.fetch.mockImplementation(fetchMock);
  core.i18n.Context.mockImplementation(I18nProvider as () => JSX.Element);

  const coreProvidersPropsMock: CoreProvidersProps = {
    core,
    pluginStart: {} as InfraClientStartExports,
    plugins: {} as InfraClientStartDeps,
    theme$: core.theme.theme$,
  };
  const getStartServices = (): InfraClientStartServices => [
    coreProvidersPropsMock.core,
    coreProvidersPropsMock.plugins,
    coreProvidersPropsMock.pluginStart,
  ];

  return {
    coreProvidersPropsMock,
    fetch: core.http.fetch,
    getStartServices,
  };
}

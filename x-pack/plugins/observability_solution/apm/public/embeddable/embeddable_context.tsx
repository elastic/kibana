/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { createMemoryHistory } from 'history';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { ApmPluginContext, ApmPluginContextValue } from '../context/apm_plugin/apm_plugin_context';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { ApmServiceContextProvider } from '../context/apm_service/apm_service_context';
import { ApmTimeRangeMetadataContextProvider } from '../context/time_range_metadata/time_range_metadata_context';
import { apmRouter } from '../components/routing/apm_route_config';
import { ApmThemeProvider } from '../components/routing/app_root';
import { ChartPointerEventContextProvider } from '../context/chart_pointer_event/chart_pointer_event_context';
import { APMEmbeddableInput } from './types';
import { ENVIRONMENT_ALL_VALUE } from '../../common/environment_filter_values';
import { EmbeddableDeps } from './types';

type APMEmbeddableContextProps = Omit<APMEmbeddableInput, 'id'> & {
  deps: EmbeddableDeps;
  children: React.ReactNode;
};

export function APMEmbeddableContext({
  serviceName,
  transactionType,
  environment = ENVIRONMENT_ALL_VALUE,
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  kuery,
  deps,
  children,
}: APMEmbeddableContextProps) {
  const params = getQueryParams({
    transactionType,
    environment,
    rangeFrom,
    rangeTo,
    kuery,
  });
  /* Many APM components rely on URL state. To account for this,
   * we create history with a spoofed initial URL to match
   * the data type for the embeddable input. */
  const routeContext = `/services/${serviceName}/overview`;
  const history = createMemoryHistory({
    initialEntries: [
      `${routeContext}?comparisonEnabled=true&latencyAggregationType=avg&offset=1d&${params}`,
    ],
  });
  const services: ApmPluginContextValue = {
    config: deps.config,
    core: deps.coreStart,
    plugins: deps.pluginsSetup,
    data: deps.pluginsStart.data,
    inspector: deps.pluginsStart.inspector,
    observability: deps.pluginsStart.observability,
    observabilityShared: deps.pluginsStart.observabilityShared,
    dataViews: deps.pluginsStart.dataViews,
    unifiedSearch: deps.pluginsStart.unifiedSearch,
    lens: deps.pluginsStart.lens,
    uiActions: deps.pluginsStart.uiActions,
    observabilityAIAssistant: deps.pluginsStart.observabilityAIAssistant,
    share: deps.pluginsSetup.share,
    kibanaEnvironment: deps.kibanaEnvironment,
    // appMountParameters: deps.appMountParameters,
    observabilityRuleTypeRegistry: deps.observabilityRuleTypeRegistry,
  };

  createCallApmApi(deps.coreStart);

  const I18nContext = deps.coreStart.i18n.Context;
  return (
    <I18nContext>
      <ApmPluginContext.Provider value={services}>
        <RouterProvider history={history} router={apmRouter as any}>
          <KibanaThemeProvider theme={deps.coreStart.theme}>
            <ApmThemeProvider>
              <KibanaContextProvider services={deps.coreStart}>
                <ApmTimeRangeMetadataContextProvider>
                  <ApmServiceContextProvider>
                    <ChartPointerEventContextProvider>{children}</ChartPointerEventContextProvider>
                  </ApmServiceContextProvider>
                </ApmTimeRangeMetadataContextProvider>
              </KibanaContextProvider>
            </ApmThemeProvider>
          </KibanaThemeProvider>
        </RouterProvider>
      </ApmPluginContext.Provider>
    </I18nContext>
  );
}

const getQueryParams = ({
  transactionName,
  transactionType,
  environment = ENVIRONMENT_ALL_VALUE,
  rangeTo = 'now',
  rangeFrom = 'now-15m',
  kuery,
}: Omit<APMEmbeddableInput, 'serviceName' | 'id'>) => {
  const transactionNameParam = transactionName
    ? `transactionName=${encodeURIComponent(transactionName)}`
    : null;
  const transactionTypeParam = transactionType
    ? `transactionType=${encodeURIComponent(transactionType)}`
    : null;
  const environmentParam = environment ? `environment=${encodeURIComponent(environment)}` : null;
  const params = [
    transactionNameParam,
    transactionTypeParam,
    environmentParam,
    `rangeFrom=${encodeURIComponent(rangeFrom)}`,
    `rangeTo=${encodeURIComponent(rangeTo)}`,
    kuery ? `kuery=${encodeURIComponent(kuery)}` : null,
  ]
    .filter(Boolean)
    .join('&');
  return params;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { createMemoryHistory } from 'history';
import type { ApmPluginContextValue } from '../context/apm_plugin/apm_plugin_context';
import { ApmPluginContext } from '../context/apm_plugin/apm_plugin_context';
import { apmRouter } from '../components/routing/apm_route_config';
import { getDateRange } from '../context/url_params_context/helpers';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { ChartPointerEventContextProvider } from '../context/chart_pointer_event/chart_pointer_event_context';
import type { EmbeddableDeps } from './types';
import { LicenseProvider } from '../context/license/license_context';
import { TimeRangeMetadataContextProvider } from '../context/time_range_metadata/time_range_metadata_context';
import { ApmIndexSettingsContextProvider } from '../context/apm_index_settings/apm_index_settings_context';

export interface ApmEmbeddableContextProps {
  deps: EmbeddableDeps;
  children: React.ReactNode;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
}

/** Providers for dashboard/flyout embeddables. Uses `I18nProvider` for react-intl but omits Core `i18n.Context` (`EuiContext`) and `KibanaThemeProvider` so the DOM stays shallow for flyout flex layout; theme/CSS still comes from the host `KibanaRenderContextProvider`. */
export function ApmEmbeddableContext({
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  kuery = '',
  deps,
  children,
}: ApmEmbeddableContextProps) {
  const { start: resolvedStart, end: resolvedEnd } = useMemo(() => {
    return getDateRange({ rangeFrom, rangeTo });
  }, [rangeFrom, rangeTo]);

  const history = useMemo(
    () =>
      createMemoryHistory({
        initialEntries: [
          `/service-map?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&kuery=${encodeURIComponent(
            kuery
          )}&comparisonEnabled=false`,
        ],
      }),
    [rangeFrom, rangeTo, kuery]
  );

  const services = {
    config: deps.config,
    core: deps.coreStart,
    plugins: deps.pluginsSetup,
    data: deps.pluginsStart.data,
    inspector: deps.pluginsStart.inspector,
    observability: deps.pluginsStart.observability,
    observabilityShared: deps.pluginsStart.observabilityShared,
    dataViews: deps.pluginsStart.dataViews,
    unifiedSearch: deps.pluginsStart.unifiedSearch,
    kql: deps.pluginsStart.kql,
    lens: deps.pluginsStart.lens,
    uiActions: deps.pluginsStart.uiActions,
    observabilityAIAssistant: deps.pluginsStart.observabilityAIAssistant,
    share: deps.pluginsSetup.share,
    kibanaEnvironment: deps.kibanaEnvironment,
    observabilityRuleTypeRegistry: deps.observabilityRuleTypeRegistry,
    licensing: deps.pluginsStart.licensing,
  } as ApmPluginContextValue;

  createCallApmApi(deps.coreStart);

  return (
    <I18nProvider>
      <ApmPluginContext.Provider value={services}>
        <KibanaContextProvider
          services={{
            ...deps.coreStart,
            apmSourcesAccess: deps.pluginsStart.apmSourcesAccess,
            dataViews: deps.pluginsStart.dataViews,
          }}
        >
          <RouterProvider router={apmRouter as any} history={history}>
            <TimeRangeMetadataContextProvider
              uiSettings={deps.coreStart.uiSettings}
              start={resolvedStart ?? rangeFrom}
              end={resolvedEnd ?? rangeTo}
              kuery={kuery}
              useSpanName={false}
            >
              <LicenseProvider>
                <ApmIndexSettingsContextProvider>
                  <ChartPointerEventContextProvider>{children}</ChartPointerEventContextProvider>
                </ApmIndexSettingsContextProvider>
              </LicenseProvider>
            </TimeRangeMetadataContextProvider>
          </RouterProvider>
        </KibanaContextProvider>
      </ApmPluginContext.Provider>
    </I18nProvider>
  );
}

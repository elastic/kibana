/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { ApmPluginContext, ApmPluginContextValue } from '../context/apm_plugin/apm_plugin_context';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { ApmThemeProvider } from '../components/routing/app_root';
import { ChartPointerEventContextProvider } from '../context/chart_pointer_event/chart_pointer_event_context';
import { EmbeddableDeps } from './types';
import { TimeRangeMetadataContextProvider } from '../context/time_range_metadata/time_range_metadata_context';

export interface ApmEmbeddableContextProps {
  deps: EmbeddableDeps;
  children: React.ReactNode;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
}

export function ApmEmbeddableContext({
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  kuery = '',
  deps,
  children,
}: ApmEmbeddableContextProps) {
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
    lens: deps.pluginsStart.lens,
    uiActions: deps.pluginsStart.uiActions,
    observabilityAIAssistant: deps.pluginsStart.observabilityAIAssistant,
    share: deps.pluginsSetup.share,
    kibanaEnvironment: deps.kibanaEnvironment,
    observabilityRuleTypeRegistry: deps.observabilityRuleTypeRegistry,
  } as ApmPluginContextValue;

  createCallApmApi(deps.coreStart);

  const I18nContext = deps.coreStart.i18n.Context;
  return (
    <I18nContext>
      <ApmPluginContext.Provider value={services}>
        <KibanaThemeProvider theme={deps.coreStart.theme}>
          <ApmThemeProvider>
            <KibanaContextProvider services={deps.coreStart}>
              <TimeRangeMetadataContextProvider
                uiSettings={deps.coreStart.uiSettings}
                start={rangeFrom}
                end={rangeTo}
                kuery={kuery}
                useSpanName={false}
              >
                <ChartPointerEventContextProvider>{children}</ChartPointerEventContextProvider>
              </TimeRangeMetadataContextProvider>
            </KibanaContextProvider>
          </ApmThemeProvider>
        </KibanaThemeProvider>
      </ApmPluginContext.Provider>
    </I18nContext>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import type { StartServices } from '../context/kibana_context/use_kibana';
import type { ApmPluginStartDeps } from '../plugin';
import { ApmThemeProvider } from '../components/routing/app_root';
import { TimeRangeMetadataContextProvider } from '../context/time_range_metadata/time_range_metadata_context';

export function InvestigateContextProvider({
  timeRange,
  query,
  coreSetup,
  children,
}: {
  coreSetup: CoreSetup<ApmPluginStartDeps>;
  children: React.ReactElement;
} & GlobalWidgetParameters) {
  const startServicesAsync = useAsync(async () => {
    return await coreSetup.getStartServices();
  }, [coreSetup]);

  if (!startServicesAsync.value) {
    return null;
  }

  const [coreStart, pluginsStart] = startServicesAsync.value;

  const start = timeRange.from;
  const end = timeRange.to;
  const kuery = query.query;

  const services = {
    ...coreStart,
    ...pluginsStart,
  } as StartServices;

  return (
    <KibanaThemeProvider theme={{ theme$: coreStart.theme.theme$ }}>
      <KibanaContextProvider services={services}>
        <ApmThemeProvider>
          <TimeRangeMetadataContextProvider
            start={start}
            end={end}
            kuery={kuery}
            uiSettings={coreStart.uiSettings}
            useSpanName={false}
          >
            {children}
          </TimeRangeMetadataContextProvider>
        </ApmThemeProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
}

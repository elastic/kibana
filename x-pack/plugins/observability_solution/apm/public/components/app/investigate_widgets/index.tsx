/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/public';
import React, { lazy } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import useAsync from 'react-use/lib/useAsync';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { APM_SERVICE_INVENTORY_WIDGET_NAME } from '../../../../common/investigate';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../../plugin';
import type { Environment } from '../../../../common/environment_rt';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { ApmThemeProvider } from '../../routing/app_root';
import { StartServices } from '../../../context/kibana_context/use_kibana';

interface RegisterInvestigateWidgetOptions {
  core: CoreSetup<ApmPluginStartDeps, unknown>;
  pluginsSetup: ApmPluginSetupDeps;
}

export function registerInvestigateWidgets(options: RegisterInvestigateWidgetOptions) {
  function WithContext({
    children,
    filters,
    query,
    timeRange,
  }: {
    children: React.ReactNode;
  } & GlobalWidgetParameters) {
    const startServicesAsync = useAsync(async () => {
      return await options.core.getStartServices();
    }, [options.core]);

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
              uiSettings={options.core.uiSettings}
              useSpanName={false}
            >
              {children}
            </TimeRangeMetadataContextProvider>
          </ApmThemeProvider>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    );
  }

  const LazyInvestigateServiceInventory = withSuspense(
    lazy(() =>
      import('./investigate_service_inventory').then((m) => ({
        default: m.InvestigateServiceInventory,
      }))
    )
  );

  options.pluginsSetup.investigate?.registerWidget(
    {
      type: APM_SERVICE_INVENTORY_WIDGET_NAME,
      description:
        'An overview of APM services. Each service shows latency, throughput and failure rate metrics, and a health status. Users can click through and investigate an individual service',
      schema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            description: 'A specific environment to filter the services by',
          },
        },
      },
    },
    async ({ parameters: { environment } }) => {
      return {};
    },
    ({ widget }) => {
      const { environment, filters, query, timeRange } = widget.parameters;
      return (
        <WithContext filters={filters} query={query} timeRange={timeRange}>
          <LazyInvestigateServiceInventory
            environment={(environment ?? 'ENVIRONMENT_ALL') as Environment}
            serviceGroup=""
            filters={filters}
            query={query}
            timeRange={timeRange}
          />
        </WithContext>
      );
    }
  );
}

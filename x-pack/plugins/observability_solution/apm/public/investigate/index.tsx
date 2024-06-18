/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/public';
import { ChromeOption } from '@kbn/investigate-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { lazy } from 'react';
import type { RegisterWidget } from '@kbn/investigate-plugin/public/types';
import type { Environment } from '../../common/environment_rt';
import {
  APM_SERVICE_DETAIL_WIDGET_NAME,
  APM_SERVICE_INVENTORY_WIDGET_NAME,
} from '../../common/investigate';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { InvestigateContextProvider } from './investigate_context_provider';
import { createInvestigateServiceDetailWidget } from './investigate_service_detail/create_investigate_service_detail_widget';

interface RegisterInvestigateWidgetOptions {
  core: CoreSetup<ApmPluginStartDeps, unknown>;
  pluginsSetup: ApmPluginSetupDeps;
  registerWidget: RegisterWidget;
}

export function registerInvestigateWidgets(options: RegisterInvestigateWidgetOptions) {
  const LazyInvestigateServiceInventory = withSuspense(
    lazy(() =>
      import('./investigate_service_inventory').then((m) => ({
        default: m.InvestigateServiceInventory,
      }))
    )
  );

  const LazyInvestigateServiceDetail = withSuspense(
    lazy(() =>
      import('./investigate_service_detail').then((m) => ({
        default: m.InvestigateServiceDetail,
      }))
    )
  );

  options.registerWidget(
    {
      type: APM_SERVICE_INVENTORY_WIDGET_NAME,
      description:
        'An overview of APM services. Each service shows latency, throughput and failure rate metrics, and a health status. Users can click through and investigate an individual service',
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            description: 'A specific environment to filter the services by',
          },
        },
      } as const,
    },
    async ({ parameters: { environment } }) => {
      return {};
    },
    ({ widget, onWidgetAdd }) => {
      const { environment: envFromParameters, filters, query, timeRange } = widget.parameters;

      const environment = (envFromParameters ?? 'ENVIRONMENT_ALL') as Environment;

      return (
        <InvestigateContextProvider
          filters={filters}
          query={query}
          timeRange={timeRange}
          coreSetup={options.core}
        >
          <LazyInvestigateServiceInventory
            environment={environment}
            serviceGroup=""
            filters={filters}
            query={query}
            timeRange={timeRange}
            onServiceClick={(service) => {
              return onWidgetAdd(
                createInvestigateServiceDetailWidget({
                  title: service.serviceName,
                  parameters: {
                    serviceName: service.serviceName,
                    environment,
                    filters,
                    query,
                    timeRange,
                  },
                })
              );
            }}
          />
        </InvestigateContextProvider>
      );
    }
  );

  options.registerWidget(
    {
      type: APM_SERVICE_DETAIL_WIDGET_NAME,
      description: `Details for a specific service. Shows throughput, latency and failure rate metrics,
        and open alerts, anomalies, and SLOs. It also shows the top transaction groups.`,
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'The name of the service that will be displayed',
          },
          environment: {
            type: 'string',
            description: 'A specific environment to filter the services by.',
          },
          transactionType: {
            type: 'string',
            description: 'Optionally filter by transaction type',
          },
        },
        required: ['serviceName'],
      } as const,
    },
    async ({ parameters: { serviceName, environment } }) => {
      return {};
    },
    ({ widget, blocks }) => {
      const { environment, filters, query, timeRange, serviceName, transactionType } =
        widget.parameters;
      return (
        <InvestigateContextProvider
          filters={filters}
          query={query}
          timeRange={timeRange}
          coreSetup={options.core}
        >
          <LazyInvestigateServiceDetail
            environment={(environment ?? 'ENVIRONMENT_ALL') as Environment}
            serviceName={serviceName}
            filters={filters}
            query={query}
            timeRange={timeRange}
            transactionType={transactionType}
            blocks={blocks}
          />
        </InvestigateContextProvider>
      );
    }
  );
}

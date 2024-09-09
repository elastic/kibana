/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React, { ComponentProps } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { offsetRt } from '../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentRt } from '../../../../common/environment_rt';
import { TraceSearchType } from '../../../../common/trace_explorer';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { RedirectTo } from '../redirect_to';
import { dependencies } from './dependencies';
import { legacyBackends } from './legacy_backends';
import { storageExplorer } from './storage_explorer';
import { TransactionTab } from '../../app/transaction_details/waterfall_with_summary/transaction_tabs';

const ServiceGroupTemplate = dynamic(() =>
  import('../templates/service_group_template').then((mod) => ({
    default: mod.ServiceGroupTemplate,
  }))
);
const ServiceInventory = dynamic(() =>
  import('../../app/service_inventory').then((mod) => ({ default: mod.ServiceInventory }))
);
const ServiceMapHome = dynamic(() =>
  import('../../app/service_map').then((mod) => ({ default: mod.ServiceMapHome }))
);
const TopTracesOverview = dynamic(() =>
  import('../../app/top_traces_overview').then((mod) => ({ default: mod.TopTracesOverview }))
);
const TraceExplorer = dynamic(() =>
  import('../../app/trace_explorer').then((mod) => ({ default: mod.TraceExplorer }))
);
const TraceExplorerAggregatedCriticalPath = dynamic(() =>
  import('../../app/trace_explorer/trace_explorer_aggregated_critical_path').then((mod) => ({
    default: mod.TraceExplorerAggregatedCriticalPath,
  }))
);
const TraceExplorerWaterfall = dynamic(() =>
  import('../../app/trace_explorer/trace_explorer_waterfall').then((mod) => ({
    default: mod.TraceExplorerWaterfall,
  }))
);
const TraceOverview = dynamic(() =>
  import('../../app/trace_overview').then((mod) => ({ default: mod.TraceOverview }))
);

function serviceGroupPage<TPath extends string>({
  path,
  element,
  title,
  serviceGroupContextTab,
}: {
  path: TPath;
  element: React.ReactElement<any, any>;
  title: string;
  serviceGroupContextTab: ComponentProps<typeof ServiceGroupTemplate>['serviceGroupContextTab'];
}): Record<
  TPath,
  {
    element: React.ReactElement<any, any>;
    params: t.TypeC<{ query: t.TypeC<{ serviceGroup: t.StringC }> }>;
    defaults: { query: { serviceGroup: string } };
  }
> {
  return {
    [path]: {
      element: (
        <ServiceGroupTemplate
          pageTitle={title}
          pagePath={path}
          serviceGroupContextTab={serviceGroupContextTab}
        >
          {element}
        </ServiceGroupTemplate>
      ),
      params: t.type({
        query: t.type({ serviceGroup: t.string }),
      }),
      defaults: { query: { serviceGroup: '' } },
    },
  } as Record<
    TPath,
    {
      element: React.ReactElement<any, any>;
      params: t.TypeC<{ query: t.TypeC<{ serviceGroup: t.StringC }> }>;
      defaults: { query: { serviceGroup: string } };
    }
  >;
}

export const ServiceInventoryTitle = i18n.translate('xpack.apm.views.serviceInventory.title', {
  defaultMessage: 'Services',
});
export const ServiceMapTitle = i18n.translate('xpack.apm.views.serviceMap.title', {
  defaultMessage: 'Service Map',
});

export const DependenciesOperationsTitle = i18n.translate(
  'xpack.apm.views.dependenciesOperations.title',
  {
    defaultMessage: 'Operations',
  }
);

export const homeRoute = {
  '/': {
    element: (
      <ApmTimeRangeMetadataContextProvider>
        <Outlet />
      </ApmTimeRangeMetadataContextProvider>
    ),
    params: t.type({
      query: t.intersection([
        environmentRt,
        t.type({
          rangeFrom: t.string,
          rangeTo: t.string,
          kuery: t.string,
          comparisonEnabled: toBooleanRt,
        }),
        t.partial({
          refreshPaused: t.union([t.literal('true'), t.literal('false')]),
          refreshInterval: t.string,
          page: toNumberRt,
          pageSize: toNumberRt,
          sortField: t.string,
          sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        }),
        offsetRt,
      ]),
    }),
    defaults: {
      query: {
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
      },
    },
    children: {
      ...serviceGroupPage({
        path: '/services',
        title: ServiceInventoryTitle,
        element: <ServiceInventory />,
        serviceGroupContextTab: 'service-inventory',
      }),
      ...serviceGroupPage({
        path: '/service-map',
        title: ServiceMapTitle,
        element: <ServiceMapHome />,
        serviceGroupContextTab: 'service-map',
      }),
      '/traces': {
        element: (
          <TraceOverview>
            <Outlet />
          </TraceOverview>
        ),
        children: {
          '/traces/explorer': {
            element: (
              <TraceExplorer>
                <Outlet />
              </TraceExplorer>
            ),
            children: {
              '/traces/explorer/waterfall': {
                element: <TraceExplorerWaterfall />,
                params: t.type({
                  query: t.intersection([
                    t.type({
                      traceId: t.string,
                      transactionId: t.string,
                      waterfallItemId: t.string,
                      detailTab: t.union([
                        t.literal(TransactionTab.timeline),
                        t.literal(TransactionTab.metadata),
                        t.literal(TransactionTab.logs),
                      ]),
                    }),
                    t.partial({
                      flyoutDetailTab: t.string,
                    }),
                  ]),
                }),
                defaults: {
                  query: {
                    waterfallItemId: '',
                    traceId: '',
                    transactionId: '',
                    detailTab: TransactionTab.timeline,
                  },
                },
              },
              '/traces/explorer/critical_path': {
                element: <TraceExplorerAggregatedCriticalPath />,
              },
              '/traces/explorer': {
                element: <RedirectTo pathname="/traces/explorer/waterfall" />,
              },
            },
            params: t.type({
              query: t.type({
                query: t.string,
                type: t.union([t.literal(TraceSearchType.kql), t.literal(TraceSearchType.eql)]),
                showCriticalPath: toBooleanRt,
              }),
            }),
            defaults: {
              query: {
                query: '',
                type: TraceSearchType.kql,
                showCriticalPath: '',
              },
            },
          },
          '/traces': {
            element: <TopTracesOverview />,
          },
        },
      },

      ...dependencies,
      ...legacyBackends,
      ...storageExplorer,
      '/': { element: <RedirectTo pathname="/services" /> },
    },
  },
};

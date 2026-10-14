/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import { z } from '@kbn/zod/v4';
import type { ComponentProps } from 'react';
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { toBooleanFromString } from '../../../../common/utils/to_boolean_from_string';
import { offsetSchema } from '../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentSchema } from '../../../../common/environment_rt';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { RedirectTo } from '../redirect_to';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { ServiceMapSearchBar } from '../../app/service_map/service_map_search_bar';
import { ServiceMapSearchProvider } from '../../app/service_map/service_map_search_context';
import { dependencies } from './dependencies';
import { legacyBackends } from './legacy_backends';
import { storageExplorer } from './storage_explorer';

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
const TraceOverview = dynamic(() =>
  import('../../app/trace_overview').then((mod) => ({ default: mod.TraceOverview }))
);

const serviceGroupPageParamsSchema = z.object({
  query: z.object({ serviceGroup: z.string() }),
});

function serviceGroupPage<TPath extends string>({
  path,
  element,
  title,
  searchBar,
  serviceGroupContextTab,
  contextWrapper: ContextWrapper,
}: {
  path: TPath;
  element: React.ReactElement<any, any>;
  title: string;
  searchBar?: React.ReactNode;
  serviceGroupContextTab: ComponentProps<typeof ServiceGroupTemplate>['serviceGroupContextTab'];
  contextWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}): Record<
  TPath,
  {
    element: React.ReactElement<any, any>;
    params: typeof serviceGroupPageParamsSchema;
    defaults: { query: { serviceGroup: string } };
  }
> {
  const template = (
    <ServiceGroupTemplate
      pageTitle={title}
      pagePath={path}
      searchBar={searchBar}
      serviceGroupContextTab={serviceGroupContextTab}
    >
      {element}
    </ServiceGroupTemplate>
  );
  return {
    [path]: {
      element: ContextWrapper ? <ContextWrapper>{template}</ContextWrapper> : template,
      params: serviceGroupPageParamsSchema,
      defaults: { query: { serviceGroup: '' } },
    },
  } as Record<
    TPath,
    {
      element: React.ReactElement<any, any>;
      params: typeof serviceGroupPageParamsSchema;
      defaults: { query: { serviceGroup: string } };
    }
  >;
}

export const ServiceInventoryTitle = i18n.translate('xpack.apm.views.serviceInventory.title', {
  defaultMessage: 'Service inventory',
});
export const ServiceMapTitle = i18n.translate('xpack.apm.views.serviceMap.title', {
  defaultMessage: 'Service map',
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
    params: z.object({
      query: environmentSchema
        .merge(
          z.object({
            rangeFrom: z.string(),
            rangeTo: z.string(),
            kuery: z.string(),
            comparisonEnabled: toBooleanFromString,
          })
        )
        .merge(
          z.object({
            refreshPaused: z.union([z.literal('true'), z.literal('false')]).optional(),
            refreshInterval: z.string().optional(),
            page: z.coerce.number().optional(),
            pageSize: z.coerce.number().optional(),
            sortField: z.string().optional(),
            sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
          })
        )
        .merge(offsetSchema),
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
        searchBar: <SearchBar showTimeComparison showEnvironmentFilter />,
        serviceGroupContextTab: 'service-inventory',
      }),
      ...serviceGroupPage({
        path: '/service-map',
        title: ServiceMapTitle,
        element: <ServiceMapHome />,
        searchBar: <ServiceMapSearchBar />,
        contextWrapper: ServiceMapSearchProvider,
        serviceGroupContextTab: 'service-map',
      }),
      '/traces': {
        element: (
          <TraceOverview searchBar={<SearchBar showEnvironmentFilter />}>
            <Outlet />
          </TraceOverview>
        ),
        children: {
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

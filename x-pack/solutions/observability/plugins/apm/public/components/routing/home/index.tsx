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
import type { ComponentProps } from 'react';
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { offsetRt } from '../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentRt } from '../../../../common/environment_rt';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { RedirectTo } from '../redirect_to';
import { SearchBar } from '../../shared/search_bar/search_bar';
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

function serviceGroupPage<TPath extends string>({
  path,
  element,
  title,
  searchBar,
  serviceGroupContextTab,
}: {
  path: TPath;
  element: React.ReactElement<any, any>;
  title: string;
  searchBar?: React.ReactNode;
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
          searchBar={searchBar}
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
        searchBar: <SearchBar showTimeComparison showEnvironmentFilter />,
        serviceGroupContextTab: 'service-inventory',
      }),
      ...serviceGroupPage({
        path: '/service-map',
        title: ServiceMapTitle,
        element: <ServiceMapHome />,
        searchBar: <SearchBar showTimeComparison showEnvironmentFilter />,
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

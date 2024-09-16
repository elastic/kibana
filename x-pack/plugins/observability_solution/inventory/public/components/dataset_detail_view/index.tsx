/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useInventoryBreadcrumbs } from '../../hooks/use_inventory_breadcrumbs';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRoutePath } from '../../hooks/use_inventory_route_path';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { EntityOverviewHeader } from '../entity_overview_header';
import { EntityOverviewHeaderTitle } from '../entity_overview_header/entity_overview_header';
import { EntityOverviewTabList } from '../entity_overview_tab_list';

type TabMap = Record<
  string,
  { selected: boolean; href: string; label: string; content: React.ReactNode }
>;

export function DatasetDetailView({ children }: { children: React.ReactNode }) {
  const {
    path: { id },
  } = useInventoryParams('/datastream/{id}/*');

  const router = useInventoryRouter();

  const routePath = useInventoryRoutePath();

  const tabs = {
    overview: {
      selected: routePath === '/datastream/{id}/overview',
      href: router.link('/datastream/{id}/overview', { path: { id } }),
      label: i18n.translate('xpack.inventory.datasetOverview.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      content: <></>,
    },
    metrics: {
      selected: routePath === '/datastream/{id}/metrics',
      href: router.link('/datastream/{id}/metrics', { path: { id } }),
      label: i18n.translate('xpack.inventory.datasetOverview.metricsTabLabel', {
        defaultMessage: 'Metrics',
      }),
      content: <></>,
    },
    manage: {
      selected: routePath.startsWith('/datastream/{id}/management'),
      href: router.link('/datastream/{id}/management', { path: { id } }),
      label: i18n.translate('xpack.inventory.datasetOverview.manageTabLabel', {
        defaultMessage: 'Manage',
      }),
      content: <></>,
    },
  } satisfies TabMap;

  useInventoryBreadcrumbs(
    () => ({ title: id, path: `/datastream/{id}`, params: { path: { id } } }),
    [id]
  );

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EntityOverviewHeader>
          <EntityOverviewHeaderTitle title={id} />
        </EntityOverviewHeader>
        <EntityOverviewTabList
          tabs={Object.entries(tabs).map(([key, { label, href, selected }]) => {
            return {
              name: key,
              label,
              href,
              selected,
            };
          })}
        />
        {children}
      </EuiFlexGroup>
    </>
  );
}

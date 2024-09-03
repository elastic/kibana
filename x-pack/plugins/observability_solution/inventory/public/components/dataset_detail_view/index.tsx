/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { EntityOverviewHeader } from '../entity_overview_header';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useInventoryRoutePath } from '../../hooks/use_inventory_route_path';

type TabMap = Record<
  string,
  { selected: boolean; href: string; label: string; content: React.ReactNode }
>;

export function DatasetDetailView({ children }: { children: React.ReactNode }) {
  const {
    path: { name },
  } = useInventoryParams('/dataset/{name}/*');

  const router = useInventoryRouter();

  const routePath = useInventoryRoutePath();

  const tabs = {
    overview: {
      selected: routePath === '/dataset/{name}/overview',
      href: router.link('/dataset/{name}/overview', { path: { name } }),
      label: i18n.translate('xpack.inventory.datasetOverview.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      content: <></>,
    },
    metrics: {
      selected: routePath === '/dataset/{name}/metrics',
      href: router.link('/dataset/{name}/metrics', { path: { name } }),
      label: i18n.translate('xpack.inventory.datasetOverview.metricsTabLabel', {
        defaultMessage: 'Metrics',
      }),
      content: <></>,
    },
  } satisfies TabMap;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EntityOverviewHeader title={name} />
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
  );
}

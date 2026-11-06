/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppHeaderBack, AppHeaderTab } from '@kbn/app-header';
import React from 'react';
import { unifiedSearchBarPlaceholder } from '../../../../common/dependencies';
import { ApmIndexSettingsContextProvider } from '../../../context/apm_index_settings/apm_index_settings_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { betaBadgeDescription } from '../../shared/beta_badge';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { ApmMainTemplate } from './apm_main_template';

interface Props {
  children: React.ReactNode;
}

export function DependencyDetailTemplate({ children }: Props) {
  const {
    query,
    query: {
      dependencyName,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      environment,
      kuery,
      comparisonEnabled,
    },
  } = useApmParams('/dependencies');

  const router = useApmRouter();

  const path = useApmRoutePath();

  const inventoryHref = router.link('/dependencies/inventory', {
    query: {
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      environment,
      kuery,
      comparisonEnabled,
    },
  });

  const operationsHref = router.link('/dependencies/operations', { query });

  const tabs: AppHeaderTab[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.apm.DependencyDetailOverview.title', {
        defaultMessage: 'Overview',
      }),
      href: router.link('/dependencies/overview', { query }),
      isSelected: path === '/dependencies/overview',
      'data-test-subj': 'apmDependencyDetailTab_overview',
    },
    {
      id: 'operations',
      label: i18n.translate('xpack.apm.DependencyDetailOperations.title', {
        defaultMessage: 'Operations',
      }),
      href: operationsHref,
      // Keep both clauses so the operation detail subpage keeps the Operations tab selected.
      isSelected: path === '/dependencies/operations' || path === '/dependencies/operation',
      badge: { iconType: 'beta', tooltip: betaBadgeDescription },
      'data-test-subj': 'apmDependencyDetailTab_operations',
    },
  ];

  // On the operation detail subpage, mirror the breadcrumb-derived back menu that Chrome Next
  // produces today: [Operations, Dependencies]. On the other tab pages a single inventory target
  // matches the existing behaviour. Mounting an inline AppHeader suppresses the breadcrumb-derived
  // fallback, so this must be explicit.
  const backToInventory: AppHeaderBack = {
    href: inventoryHref,
    label: i18n.translate('xpack.apm.views.dependenciesInventory.title', {
      defaultMessage: 'Dependencies',
    }),
  };

  const back: AppHeaderBack | AppHeaderBack[] =
    path === '/dependencies/operation'
      ? [
          {
            href: operationsHref,
            label: i18n.translate('xpack.apm.DependencyDetailOperations.title', {
              defaultMessage: 'Operations',
            }),
          },
          backToInventory,
        ]
      : backToInventory;

  return (
    <ApmIndexSettingsContextProvider>
      <ApmMainTemplate
        searchBar={
          <SearchBar
            showTimeComparison
            showEnvironmentFilter
            searchBarPlaceholder={unifiedSearchBarPlaceholder}
          />
        }
        header={{
          title: dependencyName,
          tabs,
          back,
        }}
      >
        {children}
      </ApmMainTemplate>
    </ApmIndexSettingsContextProvider>
  );
}

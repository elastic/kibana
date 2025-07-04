/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { DependenciesInventoryTitle } from '../../routing/home/dependencies';
import { DependencyDetailTemplate } from '../../routing/templates/dependency_detail_template';

export function DependencyDetailView({ children }: { children: React.ReactChild }) {
  const {
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

  const apmRouter = useApmRouter();

  useBreadcrumb(
    () => [
      {
        title: DependenciesInventoryTitle,
        href: apmRouter.link('/dependencies/inventory', {
          query: {
            rangeFrom,
            rangeTo,
            refreshInterval,
            refreshPaused,
            environment,
            kuery,
            comparisonEnabled,
          },
        }),
      },
      {
        title: dependencyName,
        href: apmRouter.link('/dependencies', {
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
        }),
      },
    ],
    [
      apmRouter,
      comparisonEnabled,
      dependencyName,
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
    ],
    {
      omitRootOnServerless: true,
    }
  );
  return <DependencyDetailTemplate>{children}</DependencyDetailTemplate>;
}

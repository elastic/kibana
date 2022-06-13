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
import { DependenciesInventoryTitle } from '../../routing/home';
import { BackendDetailTemplate } from '../../routing/templates/backend_detail_template';

export function BackendDetailView({
  children,
}: {
  children: React.ReactChild;
}) {
  const {
    query: {
      backendName,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      environment,
      kuery,
      comparisonEnabled,
    },
  } = useApmParams('/backends');

  const apmRouter = useApmRouter();

  useBreadcrumb([
    {
      title: DependenciesInventoryTitle,
      href: apmRouter.link('/backends/inventory', {
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
      title: backendName,
      href: apmRouter.link('/backends', {
        query: {
          backendName,
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
  ]);

  return <BackendDetailTemplate>{children}</BackendDetailTemplate>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { BackendDetailOperationsList } from './backend_detail_operations_list';

export function BackendDetailOperations() {
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
  } = useApmParams('/backends/operations');

  const apmRouter = useApmRouter();

  useBreadcrumb([
    {
      title: i18n.translate(
        'xpack.apm.backendDetailOperations.breadcrumbTitle',
        { defaultMessage: 'Operations' }
      ),
      href: apmRouter.link('/backends/operations', {
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

  return <BackendDetailOperationsList />;
}

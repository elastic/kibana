/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useBreadcrumb } from '../context/breadcrumbs/use_breadcrumb';
import { useAnyOfApmParams } from './use_apm_params';
import { useApmRouter } from './use_apm_router';

export function useBackendDetailOperationsBreadcrumb() {
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
  } = useAnyOfApmParams('/backends/operations', '/backends/operation');

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
}

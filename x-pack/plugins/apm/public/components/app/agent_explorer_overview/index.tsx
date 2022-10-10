/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBreadcrumb } from '@kbn/apm-plugin/public/context/breadcrumbs/use_breadcrumb';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';

export function AgentExplorerOverview({ children }: { children: React.ReactElement }) {
  const {
    query: {
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      environment,
      kuery,
      comparisonEnabled,
    },
  } = useApmParams('/agent-explorer');

  const apmRouter = useApmRouter();

  useBreadcrumb(
    () => [
      {
        title: i18n.translate(
          'xpack.apm.agentExplorerOverview.breadcrumbTitle',
          { defaultMessage: 'Agent Explorer' }
        ),
        href: apmRouter.link('/agent-explorer', {
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
    ],
    [
      apmRouter,
      comparisonEnabled,
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
    ]
  );

  return (
    <ApmMainTemplate
      pageTitle={
        i18n.translate(
          'xpack.apm.agentExplorerOverview.title',
          { defaultMessage: 'Agent Explorer' }
        )
      }
      environmentFilter={true}
    >
      {children}
    </ApmMainTemplate>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { AIOPS_ENABLED } from '@kbn/aiops-plugin/common';

import { ML_PAGES } from '../../../../locator';
import { NavigateToPath } from '../../../contexts/kibana';

import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { ExplainLogRateSpikesPage as Page } from '../../../aiops/explain_log_rate_spikes';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const explainLogRateSpikesRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'explain_log_rate_spikes',
  path: createPath(ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES),
  title: i18n.translate('xpack.ml.aiops.explainLogRateSpikes.docTitle', {
    defaultMessage: 'Explain log rate spikes',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp(
      'AIOPS_BREADCRUMB_EXPLAIN_LOG_RATE_SPIKES',
      navigateToPath,
      basePath
    ),
    {
      text: i18n.translate('xpack.ml.aiopsBreadcrumbs.explainLogRateSpikesLabel', {
        defaultMessage: 'Explain log rate spikes',
      }),
    },
  ],
  disabled: !AIOPS_ENABLED,
});

const PageWrapper: FC<PageProps> = ({ location, deps, ...restProps }) => {
  const { context } = useRouteResolver('basic', []);

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};

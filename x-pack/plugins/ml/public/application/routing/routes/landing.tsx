/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../locator';
import { basicResolvers } from '../resolvers';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { useRouteResolver } from '../use_resolver';
import type { NavigateToPath } from '../../contexts/kibana';
import { createPath, PageLoader } from '../router';
import type { MlRoute } from '../router';

// const LandingPage = React.lazy(() => import('../../landing_page/landing_page'));
const LandingPage = dynamic(async () => ({
  default: (await import('../../landing_page')).LandingPage,
}));

export const landingRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  id: 'landing',
  path: createPath(ML_PAGES.LANDING_PAGE),
  title: i18n.translate('xpack.ml.landing.landingLabel', {
    defaultMessage: 'Machine Learning',
  }),
  render: (props, deps) => <PageWrapper />,
  // render: (props, deps) => <div>Hello landing page</div>,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.landing.landingLabel', {
        defaultMessage: 'Machine Learning',
      }),
    },
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    </PageLoader>
  );
};

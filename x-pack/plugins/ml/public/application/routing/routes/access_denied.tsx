/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '../../../locator';
import { createPath, MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { Page } from '../../access_denied';

const breadcrumbs = [
  {
    text: i18n.translate('xpack.ml.accessDeniedLabel', {
      defaultMessage: 'Access denied',
    }),
  },
];

export const accessDeniedRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.ACCESS_DENIED),
  title: i18n.translate('xpack.ml.accessDeniedLabel', {
    defaultMessage: 'Access denied',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {}
  );

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};

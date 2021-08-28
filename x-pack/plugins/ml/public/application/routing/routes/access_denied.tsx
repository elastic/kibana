/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import { Page } from '../../access_denied/page';
import type { MlRoute, PageProps } from '../router';
import { PageLoader } from '../router';
import { useResolver } from '../use_resolver';

const breadcrumbs = [
  {
    text: i18n.translate('xpack.ml.accessDeniedLabel', {
      defaultMessage: 'Access denied',
    }),
    href: '',
  },
];

export const accessDeniedRouteFactory = (): MlRoute => ({
  path: '/access-denied',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context } = useResolver(undefined, undefined, deps.config, {});

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};

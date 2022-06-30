/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { Redirect } from 'react-router-dom';
import { parse } from 'query-string';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { resolver } from '../../../jobs/new_job/job_from_lens';

export const fromLensRouteFactory = (): MlRoute => ({
  path: '/jobs/new_job/from_lens',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { lensId, vis, from, to, query, filters, layerIndex }: Record<string, any> = parse(
    location.search,
    {
      sort: false,
    }
  );

  const { context } = useResolver(undefined, undefined, deps.config, deps.dataViewsContract, {
    redirect: () => resolver(lensId, vis, from, to, query, filters, layerIndex),
  });
  return <PageLoader context={context}>{<Redirect to="/jobs/new_job" />}</PageLoader>;
};

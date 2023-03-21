/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { Redirect } from 'react-router-dom';
import { parse } from 'query-string';

import { ML_PAGES } from '../../../../locator';
import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { resolver } from '../../../jobs/new_job/job_from_map';

export const fromMapRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_MAP),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const {
    dashboard,
    dataViewId,
    embeddable,
    geoField,
    splitField,
    from,
    to,
    layer,
  }: Record<string, any> = parse(location.search, {
    sort: false,
  });

  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    deps.getSavedSearchDeps,
    {
      redirect: () =>
        resolver(dashboard, dataViewId, embeddable, geoField, splitField, from, to, layer),
    }
  );
  return (
    <PageLoader context={context}>
      {<Redirect to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB)} />}
    </PageLoader>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { parse } from 'query-string';
import { useMlKibana } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../locator';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { resolver } from '../../../jobs/new_job/job_from_pattern_analysis';

export const fromPatternAnalysisRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [],
});

const PageWrapper: FC<PageProps> = ({ location }) => {
  const {
    categorizationType,
    dataViewId,
    field,
    partitionField,
    stopOnWarn,
    from,
    to,
    query,
  }: Record<string, any> = parse(location.search, {
    sort: false,
  });
  const {
    services: {
      data,
      dashboard: dashboardService,
      uiSettings: kibanaConfig,
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const { context } = useRouteResolver('full', ['canCreateJob'], {
    redirect: () =>
      resolver(
        {
          mlApiServices,
          timeFilter: data.query.timefilter.timefilter,
          kibanaConfig,
          dashboardService,
          data,
        },
        categorizationType,
        dataViewId,
        field,
        partitionField,
        stopOnWarn,
        from,
        to,
        query
      ),
  });

  return (
    <PageLoader context={context}>
      {<Redirect to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB)} />}
    </PageLoader>
  );
};

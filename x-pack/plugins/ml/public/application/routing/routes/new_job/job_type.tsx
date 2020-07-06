/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../jobs/new_job/pages/job_type';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectJobType', {
      defaultMessage: 'Create job',
    }),
    href: '',
  },
];

export const jobTypeRoute: MlRoute = {
  path: '/jobs/new_job/step/job_type',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, basicResolvers(deps));
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};

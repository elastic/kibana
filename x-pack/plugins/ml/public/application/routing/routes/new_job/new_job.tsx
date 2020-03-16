/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';

import { MlRoute } from '../../router';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.jobWizardLabel', {
      defaultMessage: 'Create job',
    }),
    href: '#/jobs/new_job',
  },
];

export const newJobRoute: MlRoute = {
  path: '/jobs/new_job',
  render: () => <Page />,
  breadcrumbs,
};

const Page: FC = () => {
  return <Redirect to="/jobs/new_job/step/index_or_search" />;
};

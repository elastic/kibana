/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Redirect } from 'react-router-dom';

import { MlRoute } from '../../router';

export const newJobRouteFactory = (): MlRoute => ({
  path: '/jobs/new_job',
  render: () => <Page />,
  // no breadcrumbs since it's just a redirect
  breadcrumbs: [],
});

const Page: FC = () => {
  return <Redirect to="/jobs/new_job/step/index_or_search" />;
};

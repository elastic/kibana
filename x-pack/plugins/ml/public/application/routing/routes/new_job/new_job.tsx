/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { ML_PAGES } from '../../../../locator';

import type { MlRoute } from '../../router';
import { createPath } from '../../router';

export const newJobRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB),
  render: () => <Page />,
  // no breadcrumbs since it's just a redirect
  breadcrumbs: [],
});

const Page: FC = () => {
  return <Redirect to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX)} />;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { InferenceEndpointsOverview } from './inference_endpoints_overview';

import { ROOT_PATH, SEARCH_INFERENCE_ENDPOINTS_PATH } from './routes';

export const InferenceEndpointsRouter: React.FC = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={SEARCH_INFERENCE_ENDPOINTS_PATH} />
      <Route path={SEARCH_INFERENCE_ENDPOINTS_PATH}>
        <InferenceEndpointsOverview />
      </Route>
    </Routes>
  );
};

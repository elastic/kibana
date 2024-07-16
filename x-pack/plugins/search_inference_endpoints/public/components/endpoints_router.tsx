/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Route, Routes } from '@kbn/shared-ux-router';

import { INFERENCE_ENDPOINTS_PATH } from './routes';

import { InferenceEndpoints } from './inference_endpoints';

export const EndpointsRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={INFERENCE_ENDPOINTS_PATH}>
        <InferenceEndpoints />
      </Route>
    </Routes>
  );
};

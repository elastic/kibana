/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { Route, Routes } from '@kbn/shared-ux-router';

import { InitialAppData } from '../../../common/types';

import { InferenceEndpoints } from './components/inference_endpoints';
import { NotFound } from './components/not_found';
import { INFERENCE_ENDPOINTS_PATH, ROOT_PATH } from './routes';

export const EnterpriseSearchRelevance: React.FC<InitialAppData> = (props) => {
  return (
    <Routes>
      <Route>
        <EnterpriseSearchRelevanceConfigured {...(props as Required<InitialAppData>)} />
      </Route>
    </Routes>
  );
};

export const EnterpriseSearchRelevanceConfigured: React.FC<Required<InitialAppData>> = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={INFERENCE_ENDPOINTS_PATH} />
      <Route path={INFERENCE_ENDPOINTS_PATH}>
        <InferenceEndpoints />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};

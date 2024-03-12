/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { AppPluginStartDependencies } from './types';

const RemoteSearchPlayground = lazy(() =>
  import('./components/app').then((module) => ({ default: module.SearchPlaygroundApp }))
);

export const renderEmbeddableApp = (services: AppPluginStartDependencies) => (
  <Suspense fallback={<></>}>
    <RemoteSearchPlayground navigation={services.navigation} />
  </Suspense>
);

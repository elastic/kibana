/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { AppPluginStartDependencies } from './types';

export const InferenceEndpoints = dynamic(async () => ({
  default: (await import('./components/app')).App,
}));

export const InferenceEndpointsProvider = dynamic(async () => ({
  default: (await import('./providers/inference_endpoints_provider')).InferenceEndpointsProvider,
}));

export const getInferenceEndpointsProvider =
  (core: CoreStart, services: AppPluginStartDependencies) =>
  (props: React.ComponentProps<typeof InferenceEndpointsProvider>) =>
    (
      <KibanaContextProvider services={{ ...core, ...services }}>
        <InferenceEndpointsProvider {...props} />
      </KibanaContextProvider>
    );

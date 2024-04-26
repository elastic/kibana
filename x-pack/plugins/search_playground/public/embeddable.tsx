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

export const Playground = dynamic(async () => ({
  default: (await import('./components/app')).App,
}));

export const PlaygroundToolbar = dynamic(async () => ({
  default: (await import('./components/toolbar')).Toolbar,
}));

export const PlaygroundProvider = dynamic(async () => ({
  default: (await import('./providers/playground_provider')).PlaygroundProvider,
}));

export const getPlaygroundProvider =
  (core: CoreStart, services: AppPluginStartDependencies) =>
  (props: React.ComponentProps<typeof PlaygroundProvider>) =>
    (
      <KibanaContextProvider services={{ ...core, ...services }}>
        <PlaygroundProvider {...props} />
      </KibanaContextProvider>
    );

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { SloPublicPluginsStart } from '../../..';
import { Configuration } from './configuration';
import type { EmbeddableProps, SloBurnRateEmbeddableState } from './types';

export async function openConfiguration(
  coreStart: CoreStart,
  pluginStart: SloPublicPluginsStart,
  initialState?: SloBurnRateEmbeddableState
): Promise<EmbeddableProps> {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  return new Promise(async (resolve, reject) => {
    try {
      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              ...coreStart,
              ...pluginStart,
            }}
          >
            <QueryClientProvider client={queryClient}>
              <Configuration
                onCreate={(update: EmbeddableProps) => {
                  flyoutSession.close();
                  resolve(update);
                }}
                onCancel={() => {
                  flyoutSession.close();
                  reject();
                }}
              />
            </QueryClientProvider>
          </KibanaContextProvider>,
          coreStart
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SloPublicPluginsStart } from '../../..';
import { SloConfiguration } from './slo_configuration';
import type { EmbeddableSloProps } from './types';
export async function openSloConfiguration(
  coreStart: CoreStart,
  pluginStart: SloPublicPluginsStart,
  initialState?: EmbeddableSloProps
): Promise<EmbeddableSloProps> {
  const { overlays } = coreStart;
  const queryClient = new QueryClient();
  return new Promise(async (resolve, reject) => {
    try {
      const modalSession = overlays.openModal(
        toMountPoint(
          <KibanaContextProvider
            services={{
              ...coreStart,
              ...pluginStart,
            }}
          >
            <QueryClientProvider client={queryClient}>
              <SloConfiguration
                initialInput={initialState}
                onCreate={(update: EmbeddableSloProps) => {
                  modalSession.close();
                  resolve(update);
                }}
                onCancel={() => {
                  modalSession.close();
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

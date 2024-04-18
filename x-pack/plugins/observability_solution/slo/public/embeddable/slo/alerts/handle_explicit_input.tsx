/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EmbeddableSloProps, SloAlertsEmbeddableInput } from './types';

import { SloPublicPluginsStart } from '../../../types';
import { SloConfiguration } from './slo_configuration';
export async function resolveEmbeddableSloUserInput(
  coreStart: CoreStart,
  pluginStart: SloPublicPluginsStart,
  input?: SloAlertsEmbeddableInput
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
                initialInput={input}
                onCreate={(update: EmbeddableSloProps) => {
                  modalSession.close();
                  resolve(update);
                }}
                onCancel={() => {
                  modalSession.close();
                  // @ts-expect-error
                  resolve(undefined);
                }}
              />
            </QueryClientProvider>
          </KibanaContextProvider>,
          { i18n: coreStart.i18n, theme: coreStart.theme }
        )
      );
    } catch (error) {
      reject(error);
    }
  });
}

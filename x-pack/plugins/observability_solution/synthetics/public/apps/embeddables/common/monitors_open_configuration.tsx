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
import { MonitorFilters } from '../monitors_overview/types';
import { ClientPluginsStart } from '../../../plugin';
import { MonitorConfiguration } from './monitor_configuration';

export async function openMonitorConfiguration({
  coreStart,
  pluginStart,
  initialState,
  title,
}: {
  title: string;
  coreStart: CoreStart;
  pluginStart: ClientPluginsStart;
  initialState?: { filters: MonitorFilters };
}): Promise<{ filters: MonitorFilters }> {
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
              <MonitorConfiguration
                title={title}
                initialInput={initialState}
                onCreate={(update: { filters: MonitorFilters }) => {
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

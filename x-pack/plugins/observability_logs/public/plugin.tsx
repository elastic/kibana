/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import React from 'react';
import {
  ObservabilityLogsPluginSetup,
  ObservabilityLogsPluginStart,
  ObservabilityLogsStartDeps,
} from './types';
import { InternalStateProvider } from './utils/internal_state_container_context';

export class ObservabilityLogsPlugin
  implements Plugin<ObservabilityLogsPluginSetup, ObservabilityLogsPluginStart>
{
  public setup(core: CoreSetup): ObservabilityLogsPluginSetup {}

  public start(core: CoreStart, plugins: ObservabilityLogsStartDeps): ObservabilityLogsPluginStart {
    const { discover } = plugins;

    /**
     * Replace the DataViewPicker with a custom DataStreamSelector to access only integrations streams
     */
    discover.customize('observability-logs', async ({ customizations, stateContainer }) => {
      const { CustomDataStreamSelector } = await import(
        './customizations/custom_data_stream_selector'
      );

      customizations.set({
        id: 'search_bar',
        CustomDataViewPicker: () => {
          return (
            <InternalStateProvider value={stateContainer.internalState}>
              <CustomDataStreamSelector stateContainer={stateContainer} />
            </InternalStateProvider>
          );
        },
      });

      /**
       * Hide New, Open and Save settings to prevent working with saved views.
       */
      customizations.set({
        id: 'top_nav',
        defaultMenu: {
          new: { disabled: true },
          open: { disabled: true },
          save: { disabled: true },
        },
      });

      return () => {
        // eslint-disable-next-line no-console
        console.log('Cleaning up Logs explorer customizations');
      };
    });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import React from 'react';
import { IntegrationsService } from './services/integrations';
import {
  ObservabilityLogsClientPluginClass,
  ObservabilityLogsPluginSetup,
  ObservabilityLogsPluginStart,
  ObservabilityLogsStartDeps,
} from './types';
import { InternalStateProvider } from './utils/internal_state_container_context';

export class ObservabilityLogsPlugin implements ObservabilityLogsClientPluginClass {
  private integrationsService: IntegrationsService;

  constructor() {
    this.integrationsService = new IntegrationsService();
  }

  public setup() {}

  public start(core: CoreStart, plugins: ObservabilityLogsStartDeps) {
    const { discover } = plugins;

    const getStartServices = () => ({ core, plugins, pluginStart });

    const integrationsService = this.integrationsService.start({
      http: core.http,
    });

    const pluginStart = {
      integrationsService,
    };

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
            <CustomDataStreamSelector {...getStartServices()} stateContainer={stateContainer} />
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

    return pluginStart;
  }
}

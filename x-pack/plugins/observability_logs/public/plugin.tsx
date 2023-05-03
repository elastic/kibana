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

export class ObservabilityLogsPlugin
  implements Plugin<ObservabilityLogsPluginSetup, ObservabilityLogsPluginStart>
{
  public setup(core: CoreSetup): ObservabilityLogsPluginSetup {}

  public start(core: CoreStart, plugins: ObservabilityLogsStartDeps): ObservabilityLogsPluginStart {
    const { discover } = plugins;

    discover.customize('log-data-stream-selector', async ({ customizations, stateContainer }) => {
      customizations.set({
        id: 'search_bar',
        CustomDataViewPicker: () => {
          return <h1>Test replace</h1>;
        },
      });

      return () => {
        // eslint-disable-next-line no-console
        console.log('Cleaning up Logs explorer customizations');
      };
    });
  }
}

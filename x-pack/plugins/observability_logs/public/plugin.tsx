/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { OBSERVABILITY_LOGS_PROFILE_ID } from '../common';
import { createLazyCustomDataStreamSelector } from './customizations';
import { DataStreamsService } from './services/data_streams';
import { ObservabilityLogsClientPluginClass, ObservabilityLogsStartDeps } from './types';

export class ObservabilityLogsPlugin implements ObservabilityLogsClientPluginClass {
  private dataStreamsService: DataStreamsService;

  constructor() {
    this.dataStreamsService = new DataStreamsService();
  }

  public setup() {}

  public start(core: CoreStart, plugins: ObservabilityLogsStartDeps) {
    const { discover } = plugins;

    const dataStreamsService = this.dataStreamsService.start({
      http: core.http,
    });

    const pluginStart = {
      dataStreamsService,
    };

    discover.customize(
      OBSERVABILITY_LOGS_PROFILE_ID,
      async ({ customizations, stateContainer }) => {
        /**
         * Replace the DataViewPicker with a custom `DataStreamSelector` to pick integrations streams
         */
        customizations.set({
          id: 'search_bar',
          CustomDataViewPicker: createLazyCustomDataStreamSelector({
            dataStreamsClient: dataStreamsService.client,
            stateContainer,
          }),
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
      }
    );

    return pluginStart;
  }
}

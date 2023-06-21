/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';
import { createLazyCustomDatasetSelector } from './customizations';
import { DatasetsService } from './services/datasets';
import { DiscoverLogExplorerClientPluginClass, DiscoverLogExplorerStartDeps } from './types';

export class DiscoverLogExplorerPlugin implements DiscoverLogExplorerClientPluginClass {
  private datasetsService: DatasetsService;

  constructor() {
    this.datasetsService = new DatasetsService();
  }

  public setup() {}

  public start(core: CoreStart, plugins: DiscoverLogExplorerStartDeps) {
    const { discover } = plugins;

    const datasetsService = this.datasetsService.start({
      http: core.http,
    });

    const pluginStart = {
      datasetsService,
    };

    discover.customize(LOG_EXPLORER_PROFILE_ID, async ({ customizations, stateContainer }) => {
      /**
       * Replace the DataViewPicker with a custom `DatasetSelector` to pick integrations streams
       */
      customizations.set({
        id: 'search_bar',
        CustomDataViewPicker: createLazyCustomDatasetSelector({
          datasetsClient: datasetsService.client,
          stateContainer,
        }),
      });

      /**
       * Hide New, Open and Save settings to prevent working with saved views.
       */
      customizations.set({
        id: 'top_nav',
        defaultMenu: {
          newItem: { disabled: true },
          openItem: { disabled: true },
          saveItem: { disabled: true },
        },
      });
    });

    return pluginStart;
  }
}

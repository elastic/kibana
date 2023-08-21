/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { CustomizationCallback } from '@kbn/discover-plugin/public';
import React from 'react';
import { dynamic } from '../../common/utils/dynamic';
import { DatasetsServiceSetup } from '../services/datasets';

const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));
const LazyCustomDatasetFilters = dynamic(() => import('./custom_dataset_filters'));

interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  datasetsClient: DatasetsServiceSetup['client'];
}

export const createLogExplorerProfileCustomizations =
  ({
    core,
    data,
    datasetsClient,
  }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    // Lazy load dependencies
    const logExplorerMachineModuleLoadable = import('../state_machines/log_explorer_profile');

    const { initializeLogExplorerProfileStateService, waitForState } =
      await logExplorerMachineModuleLoadable;

    const logExplorerProfileStateService = initializeLogExplorerProfileStateService({
      stateContainer,
      toasts: core.notifications.toasts,
    });

    //
    /**
     * Wait for the machine to be fully initialized to set the restored selection
     * create the DataView and set it in the stateContainer from Discover
     */
    await waitForState(logExplorerProfileStateService, 'initialized');

    /**
     * Replace the DataViewPicker with a custom `DatasetSelector` to pick integrations streams
     * Prepend the search bar with custom filter control groups depending on the selected dataset
     */
    customizations.set({
      id: 'search_bar',
      CustomDataViewPicker: () => (
        <LazyCustomDatasetSelector
          datasetsClient={datasetsClient}
          logExplorerProfileStateService={logExplorerProfileStateService}
        />
      ),
      PrependFilterBar: () => (
        <LazyCustomDatasetFilters
          logExplorerProfileStateService={logExplorerProfileStateService}
          data={data}
        />
      ),
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
  };

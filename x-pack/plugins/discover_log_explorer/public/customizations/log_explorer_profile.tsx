/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CustomizationCallback } from '@kbn/discover-plugin/public';
import React from 'react';
import { dynamic } from '../utils/dynamic';

const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));
const LazyCustomDatasetFilters = dynamic(() => import('./custom_dataset_filters'));

interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
}

export const createLogExplorerProfileCustomizations =
  ({ core, data }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    const { DatasetsService } = await import('../services/datasets');
    const datasetsService = new DatasetsService().start({
      http: core.http,
    });

    /**
     * Replace the DataViewPicker with a custom `DatasetSelector` to pick integrations streams
     */
    customizations.set({
      id: 'search_bar',
      CustomDataViewPicker: () => (
        <LazyCustomDatasetSelector
          datasetsClient={datasetsService.client}
          stateContainer={stateContainer}
        />
      ),
      PrependFilterBar: () => (
        <LazyCustomDatasetFilters stateContainer={stateContainer} data={data} />
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

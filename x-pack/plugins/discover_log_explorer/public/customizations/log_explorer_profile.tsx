/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { CustomizationCallback } from '@kbn/discover-plugin/public';
import React from 'react';
import { interpret } from 'xstate';
import { createLogExplorerProfileStateMachine } from '../state_machines/log_explorer_profile';
import { DiscoverLogExplorerStartDeps } from '../types';
import { AllDatasetSelection } from '../utils/dataset_selection';
import { dynamic } from '../utils/dynamic';

const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));

interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  plugins: DiscoverLogExplorerStartDeps;
}

export const createLogExplorerProfileCustomizations =
  ({ core, plugins }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    const { DatasetsService } = await import('../services/datasets');
    const datasetsService = new DatasetsService().start({
      http: core.http,
    });

    const logExplorerProfileStateService = interpret(
      createLogExplorerProfileStateMachine({
        dataViews: plugins.dataViews,
        stateContainer,
        toasts: core.notifications.toasts,
      })
    );
    logExplorerProfileStateService.start();
    await waitForState(logExplorerProfileStateService, 'initialized');

    /**
     * Replace the DataViewPicker with a custom `DatasetSelector` to pick integrations streams
     */
    customizations.set({
      id: 'search_bar',
      CustomDataViewPicker: () => (
        <LazyCustomDatasetSelector
          datasetsClient={datasetsService.client}
          logExplorerProfileStateService={logExplorerProfileStateService}
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

async function waitForState(machineService, targetState) {
  return new Promise((resolve) => {
    const listener = (state) => {
      if (state.matches(targetState)) {
        resolve(state);
        machineService.off(listener); // Unsubscribe the listener once the target state is matched
      }
    };

    machineService.onTransition(listener);
  });
}

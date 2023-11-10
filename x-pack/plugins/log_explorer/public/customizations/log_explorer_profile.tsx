/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { CustomizationCallback } from '@kbn/discover-plugin/public';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { type Observable } from 'rxjs';
import { waitFor } from 'xstate/lib/waitFor';
import { LogExplorerStateContainer } from '../components/log_explorer';
import { LogExplorerController } from '../controller';
import { LogExplorerStartDeps } from '../types';
import { dynamic } from '../utils/dynamic';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';

const LazyCustomDatasetFilters = dynamic(() => import('./custom_dataset_filters'));
const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));
const LazyCustomFlyoutContent = dynamic(() => import('./custom_flyout_content'));

export interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  plugins: LogExplorerStartDeps;
  state$?: Observable<LogExplorerStateContainer>;
  controller: LogExplorerController;
}

export const createLogExplorerProfileCustomizations =
  ({
    core,
    plugins,
    controller,
  }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    const { data, dataViews, discover } = plugins;
    const { service } = controller;

    service.send('RECEIVED_STATE_CONTAINER', { discoverStateContainer: stateContainer });

    /**
     * Wait for the machine to be fully initialized to set the restored selection
     * create the DataView and set it in the stateContainer from Discover
     */
    await waitFor(service, (state) => state.matches('initialized'), { timeout: 30000 });

    /**
     * Replace the DataViewPicker with a custom `DatasetSelector` to pick integrations streams
     * Prepend the search bar with custom filter control groups depending on the selected dataset
     */
    customizations.set({
      id: 'search_bar',
      CustomDataViewPicker: () => {
        const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

        return (
          <KibanaContextProviderForPlugin>
            <LazyCustomDatasetSelector
              datasetsClient={controller.datasetsClient}
              dataViews={dataViews}
              discover={discover}
              logExplorerControllerStateService={service}
            />
          </KibanaContextProviderForPlugin>
        );
      },
      PrependFilterBar: () => (
        <LazyCustomDatasetFilters logExplorerControllerStateService={service} data={data} />
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

    /**
     * Hide flyout actions to prevent rendering hard-coded actions.
     */
    customizations.set({
      id: 'flyout',
      actions: {
        defaultActions: {
          viewSingleDocument: { disabled: true },
          viewSurroundingDocument: { disabled: true },
        },
      },
      Content: (props) => {
        const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

        const internalState = useObservable(
          stateContainer.internalState.state$,
          stateContainer.internalState.get()
        );

        return (
          <KibanaContextProviderForPlugin>
            <LazyCustomFlyoutContent {...props} dataView={internalState.dataView} />
          </KibanaContextProviderForPlugin>
        );
      },
    });

    return () => {};
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { CustomizationCallback } from '@kbn/discover-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { waitFor } from 'xstate/lib/waitFor';
import type { LogExplorerController } from '../controller';
import { LogExplorerControllerProvider } from '../controller/provider';
import type { LogExplorerStartDeps } from '../types';
import { dynamic } from '../utils/dynamic';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';
import { createCustomSearchBar } from './custom_search_bar';

const LazyCustomDatasetFilters = dynamic(() => import('./custom_dataset_filters'));
const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));
const LazyCustomFlyoutContent = dynamic(() => import('./custom_flyout_content'));

export interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  plugins: LogExplorerStartDeps;
  controller: LogExplorerController;
}

export const createLogExplorerProfileCustomizations =
  ({
    core,
    plugins,
    controller,
  }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    const { discoverServices, service } = controller;
    const pluginsWithOverrides = {
      ...plugins,
      ...discoverServices,
    };
    const { data, dataViews, discover, navigation, unifiedSearch } = pluginsWithOverrides;

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
      CustomSearchBar: createCustomSearchBar({
        data,
        navigation,
        unifiedSearch,
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
      defaultBadges: {
        unsavedChangesBadge: { disabled: true },
      },
    });

    /**
     * Hide flyout actions to prevent rendering hard-coded actions.
     */
    customizations.set({
      id: 'flyout',
      size: '60%',
      title: i18n.translate('xpack.logExplorer.flyoutDetail.title', {
        defaultMessage: 'Log details',
      }),
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
            <LogExplorerControllerProvider controller={controller}>
              <LazyCustomFlyoutContent {...props} dataView={internalState.dataView} />
            </LogExplorerControllerProvider>
          </KibanaContextProviderForPlugin>
        );
      },
    });

    return () => {};
  };

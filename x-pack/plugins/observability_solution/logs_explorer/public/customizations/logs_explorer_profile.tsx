/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/rules-of-hooks */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { CustomizationCallback } from '@kbn/discover-plugin/public';
import { i18n } from '@kbn/i18n';
import { waitFor } from 'xstate/lib/waitFor';
import { dynamic } from '@kbn/shared-ux-utility';
import type { LogsExplorerController } from '../controller';
import { LogsExplorerControllerProvider } from '../controller/provider';
import type { LogsExplorerStartDeps } from '../types';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';
import { createCustomSearchBar } from './custom_search_bar';
import { createCustomCellRenderer } from './custom_cell_renderer';
import { createCustomGridColumnsConfiguration } from './custom_column';
import { smartFields } from './custom_field_list';
import { createCustomUnifiedHistogram } from './custom_unified_histogram';

const LazyCustomDataSourceFilters = dynamic(() => import('./custom_data_source_filters'));
const LazyCustomDataSourceSelector = dynamic(() => import('./custom_data_source_selector'));
const LazyCustomFlyoutContent = dynamic(() => import('./custom_flyout_content'));

export interface CreateLogsExplorerProfileCustomizationsDeps {
  core: CoreStart;
  plugins: LogsExplorerStartDeps;
  controller: LogsExplorerController;
}

export const createLogsExplorerProfileCustomizations =
  ({
    core,
    plugins,
    controller,
  }: CreateLogsExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    const { discoverServices, service } = controller;
    const pluginsWithOverrides = {
      ...plugins,
      ...discoverServices,
    };
    const { data, dataViews, navigation, unifiedSearch } = pluginsWithOverrides;
    service.send('RECEIVED_STATE_CONTAINER', { discoverStateContainer: stateContainer });

    /**
     * Wait for the machine to be fully initialized to set the restored selection
     * create the DataView and set it in the stateContainer from Discover
     */
    await waitFor(service, (state) => state.matches('initialized'), { timeout: 30000 });

    /**
     * Replace the DataViewPicker with a custom `DataSourceSelector` to pick integrations streams
     * Prepend the search bar with custom filter control groups depending on the selected dataset
     */
    customizations.set({
      id: 'search_bar',
      CustomDataViewPicker: () => {
        const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

        return (
          <KibanaContextProviderForPlugin>
            <LazyCustomDataSourceSelector
              controller={controller}
              core={core}
              datasetsClient={controller.datasetsClient}
              dataViews={dataViews}
              logsExplorerControllerStateService={service}
            />
          </KibanaContextProviderForPlugin>
        );
      },
      PrependFilterBar: () => (
        <LazyCustomDataSourceFilters logsExplorerControllerStateService={service} data={data} />
      ),
      CustomSearchBar: createCustomSearchBar({
        data,
        navigation,
        unifiedSearch,
      }),
    });

    customizations.set({
      id: 'data_table',
      customCellRenderer: createCustomCellRenderer({ data }),
      customGridColumnsConfiguration: createCustomGridColumnsConfiguration(),
      customControlColumnsConfiguration: await import('./custom_control_column').then((module) =>
        module.createCustomControlColumnsConfiguration(service)
      ),
    });

    customizations.set({
      id: 'field_list',
      additionalFieldGroups: {
        smartFields,
      },
    });

    // Fix bug where filtering on histogram does not work
    customizations.set(createCustomUnifiedHistogram(data));

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
      title: i18n.translate('xpack.logsExplorer.flyoutDetail.title', {
        defaultMessage: 'Log details',
      }),
      actions: {
        defaultActions: {
          viewSingleDocument: { disabled: true },
          viewSurroundingDocument: { disabled: true },
        },
      },
      docViewsRegistry: (registry) => {
        registry.add({
          id: 'doc_view_log_overview',
          title: i18n.translate('xpack.logsExplorer.flyoutDetail.docViews.overview', {
            defaultMessage: 'Overview',
          }),
          order: 0,
          component: (props) => {
            const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

            return (
              <KibanaContextProviderForPlugin>
                <LogsExplorerControllerProvider controller={controller}>
                  <LazyCustomFlyoutContent {...props} />
                </LogsExplorerControllerProvider>
              </KibanaContextProviderForPlugin>
            );
          },
        });

        return registry;
      },
    });

    return () => {};
  };

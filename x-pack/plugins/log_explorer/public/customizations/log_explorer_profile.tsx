/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { CustomizationCallback, DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { combineLatest, from, map, Subscription, type BehaviorSubject } from 'rxjs';
import { LogExplorerStateContainer } from '../components/log_explorer';
import { LogExplorerCustomizations } from '../components/log_explorer/types';
import { LogExplorerCustomizationsProvider } from '../hooks/use_log_explorer_customizations';
import { LogExplorerProfileStateService } from '../state_machines/log_explorer_profile';
import { LogExplorerStartDeps } from '../types';
import { dynamic } from '../utils/dynamic';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';

const LazyCustomDatasetFilters = dynamic(() => import('./custom_dataset_filters'));
const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));
const LazyCustomFlyoutContent = dynamic(() => import('./custom_flyout_content'));

export interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  customizations: LogExplorerCustomizations;
  plugins: LogExplorerStartDeps;
  state$?: BehaviorSubject<LogExplorerStateContainer>;
}

export const createLogExplorerProfileCustomizations =
  ({
    core,
    customizations: logExplorerCustomizations,
    plugins,
    state$,
  }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    const { data, dataViews, discover } = plugins;
    // Lazy load dependencies
    const datasetServiceModuleLoadable = import('../services/datasets');
    const logExplorerMachineModuleLoadable = import('../state_machines/log_explorer_profile');

    const [{ DatasetsService }, { initializeLogExplorerProfileStateService, waitForState }] =
      await Promise.all([datasetServiceModuleLoadable, logExplorerMachineModuleLoadable]);

    const datasetsClient = new DatasetsService().start({
      http: core.http,
    }).client;

    const logExplorerProfileStateService = initializeLogExplorerProfileStateService({
      datasetsClient,
      stateContainer,
      toasts: core.notifications.toasts,
    });

    /**
     * Wait for the machine to be fully initialized to set the restored selection
     * create the DataView and set it in the stateContainer from Discover
     */
    await waitForState(logExplorerProfileStateService, 'initialized');

    /**
     * Subscribe the state$ BehaviorSubject when the consumer app wants to react to state changes.
     * It emits a combined state of:
     * - log explorer state machine context
     * - appState from the discover stateContainer
     */
    let stateSubscription: Subscription;
    if (state$) {
      stateSubscription = createStateUpdater({
        logExplorerProfileStateService,
        stateContainer,
      }).subscribe(state$);
    }

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
              datasetsClient={datasetsClient}
              dataViews={dataViews}
              discover={discover}
              logExplorerProfileStateService={logExplorerProfileStateService}
            />
          </KibanaContextProviderForPlugin>
        );
      },
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
            <LogExplorerCustomizationsProvider value={logExplorerCustomizations}>
              <LazyCustomFlyoutContent {...props} dataView={internalState.dataView} />
            </LogExplorerCustomizationsProvider>
          </KibanaContextProviderForPlugin>
        );
      },
    });

    return () => {
      if (stateSubscription) {
        stateSubscription.unsubscribe();
      }
    };
  };

const createStateUpdater = ({
  logExplorerProfileStateService,
  stateContainer,
}: {
  logExplorerProfileStateService: LogExplorerProfileStateService;
  stateContainer: DiscoverStateContainer;
}) => {
  return combineLatest([from(logExplorerProfileStateService), stateContainer.appState.state$]).pipe(
    map(([logExplorerState, appState]) => ({
      logExplorerState: logExplorerState.context,
      appState,
    }))
  );
};

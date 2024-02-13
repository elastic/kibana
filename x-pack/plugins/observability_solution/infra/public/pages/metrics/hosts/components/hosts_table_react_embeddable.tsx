/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters } from '@kbn/core-application-browser';
import {
  DefaultEmbeddableApi,
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  useReactEmbeddableApiHandle,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { InfraPublicConfig } from '../../../../../common/plugin_config_types';
import { PluginConfigProvider } from '../../../../containers/plugin_config_context';
import { SourceProvider, useSourceContext } from '../../../../containers/metrics_source';
import { InfraClientStartDeps } from '../../../../types';
import { KibanaEnvContext } from '../../../../hooks/use_kibana';
import { InfraClientStartExports } from '../../../..';
import { CoreProviders } from '../../../../apps/common_providers';
import { HostsTableProvider } from '../hooks/use_hosts_table';
import { HostsViewProvider } from '../hooks/use_hosts_view';
import { HostCountProvider } from '../hooks/use_host_count';
import { HostsTable } from './hosts_table';
import { UnifiedSearchProvider } from '../hooks/use_unified_search';
import { MetricsDataViewProvider } from '../hooks/use_metrics_data_view';

const HOSTS_TABLE_ID = 'hosts_table';

interface HostsTableSerializedState {}

type HostsTableApi = DefaultEmbeddableApi;

interface Props {
  core: CoreStart;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  theme$: AppMountParameters['theme$'];
  kibanaEnvironment?: KibanaEnvContext;
  pluginConfig: InfraPublicConfig;
}

export const registerHostsTableEmbeddable = ({
  core,
  pluginStart,
  plugins,
  theme$,
  kibanaEnvironment,
  pluginConfig,
}: Props) => {
  const hostsTableEmbeddableFactory: ReactEmbeddableFactory<
    HostsTableSerializedState,
    HostsTableApi
  > = {
    deserializeState: (state) => {
      /**
       * Here we can run migrations and inject references.
       */
      return state.rawState as HostsTableSerializedState;
    },
    getComponent: async (state, maybeId) => {
      /**
       * initialize state (source of truth)
       */
      const uuid = initializeReactEmbeddableUuid(maybeId);
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(state);

      /**
       * getComponent is async so you can async import the component or load a saved object here.
       * the loading will be handed gracefully by the Presentation Container.
       */

      return RegisterReactEmbeddable((apiRef) => {
        /**
         * Unsaved changes logic is handled automatically by this hook. You only need to provide
         * a subject, setter, and optional state comparator for each key in your state type.
         */
        const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
          uuid,
          hostsTableEmbeddableFactory,
          titleComparators
        );

        /**
         * Publish the API. This is what gets forwarded to the Actions framework, and to whatever the
         * parent of this embeddable is.
         */
        useReactEmbeddableApiHandle(
          {
            ...titlesApi,
            unsavedChanges,
            resetUnsavedChanges,
            serializeState: async () => {
              return {
                rawState: serializeTitles(),
              };
            },
          },
          apiRef,
          uuid
        );

        return (
          <CoreProviders
            core={core}
            pluginStart={pluginStart}
            plugins={plugins}
            theme$={theme$}
            kibanaEnvironment={kibanaEnvironment}
          >
            <SourceProvider sourceId="default">
              <PluginConfigProvider value={pluginConfig}>
                <HostsTableComponent />
              </PluginConfigProvider>
            </SourceProvider>
          </CoreProviders>
        );
      });
    },
  };

  /**
   * Register the defined Embeddable Factory - notice that this isn't defined
   * on the plugin. Instead, it's a simple imported function. I.E to register an
   * embeddable, you only need the embeddable plugin in your requiredBundles
   */
  registerReactEmbeddableFactory(HOSTS_TABLE_ID, hostsTableEmbeddableFactory);
};

const HostsTableComponent: React.FC = () => {
  const { source } = useSourceContext();

  if (!source) return null;

  return (
    <MetricsDataViewProvider metricAlias={source.configuration.metricAlias}>
      <UnifiedSearchProvider>
        <HostsViewProvider>
          <HostsTableProvider>
            <HostCountProvider>
              <HostsTable />
            </HostCountProvider>
          </HostsTableProvider>
        </HostsViewProvider>
      </UnifiedSearchProvider>
    </MetricsDataViewProvider>
  );
};

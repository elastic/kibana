/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, AppMountParameters, CoreStart } from 'kibana/public';
import { EmbeddableSetup } from 'src/plugins/embeddable/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { i18n } from '@kbn/i18n';
import { IngestManagerStart } from '../../ingest_manager/public';
import { ResolverEmbeddableFactory } from './embeddables/resolver';
import {
  EndpointAppSubplugins,
  SubpluginProviderDefinition,
  Subplugin,
} from './applications/endpoint/types';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginSetupDependencies {
  embeddable: EmbeddableSetup;
  data: DataPublicPluginStart;
}
export interface EndpointPluginStartDependencies {
  data: DataPublicPluginStart;
  ingestManager: IngestManagerStart;
}

/**
 * Functionality that the endpoint plugin uses from core.
 */
export interface EndpointPluginServices extends Partial<CoreStart> {
  http: CoreStart['http'];
  overlays: CoreStart['overlays'] | undefined;
  notifications: CoreStart['notifications'] | undefined;
  data: DataPublicPluginStart;
}

const instantiatedSubplugin = <State>(
  provider: SubpluginProviderDefinition<State>,
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  params: AppMountParameters
): Subplugin<State> => {
  return {
    reducer: provider.reducer,
    middleware: provider.middleware(coreStart, depsStart, params),
    Routes: provider.Routes(coreStart, depsStart, params),
    SelectorContextProvider: provider.SelectorContextProvider,
  };
};

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginSetup,
      EndpointPluginStart,
      EndpointPluginSetupDependencies,
      EndpointPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<EndpointPluginStartDependencies>,
    plugins: EndpointPluginSetupDependencies
  ) {
    core.application.register({
      id: 'endpoint',
      title: i18n.translate('xpack.endpoint.pluginTitle', {
        defaultMessage: 'Endpoint',
      }),
      euiIconType: 'securityApp',
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const [
          { renderApp },
          { alertingSubprovider },
          { hostsSubprovider },
          { policyListSubprovider },
          { policyDetailsSubprovider },
        ] = await Promise.all([
          import('./applications/endpoint'),
          import('./applications/endpoint/alerting'),
          import('./applications/endpoint/hosts'),
          import('./applications/endpoint/policy_list'),
          import('./applications/endpoint/policy_details'),
        ]);

        const subplugins: EndpointAppSubplugins = {
          alerting: instantiatedSubplugin(alertingSubprovider, coreStart, depsStart, params),
          hosts: instantiatedSubplugin(hostsSubprovider, coreStart, depsStart, params),
          policyList: instantiatedSubplugin(policyListSubprovider, coreStart, depsStart, params),
          policyDetails: instantiatedSubplugin(
            policyDetailsSubprovider,
            coreStart,
            depsStart,
            params
          ),
        };

        return renderApp(coreStart, depsStart, params, subplugins);
      },
    });

    const resolverEmbeddableFactory = new ResolverEmbeddableFactory();

    plugins.embeddable.registerEmbeddableFactory(
      resolverEmbeddableFactory.type,
      resolverEmbeddableFactory
    );
  }

  public start() {}

  public stop() {}
}

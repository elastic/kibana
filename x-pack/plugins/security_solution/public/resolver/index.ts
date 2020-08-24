/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverPluginSetup } from './types';

/**
 * These exports are used by the plugin 'resolverTest' defined in x-pack's plugin_functional suite.
 */

/**
 * Provide access to Resolver APIs.
 */
export async function resolverPluginSetup(): Promise<ResolverPluginSetup> {
  const [
    { Provider },
    { resolverStoreFactory },
    { ResolverWithoutProviders },
    { noAncestorsTwoChildren },
  ] = await Promise.all([
    import('react-redux'),
    import('./store/index'),
    import('./view/resolver_without_providers'),
    import('./data_access_layer/mocks/no_ancestors_two_children'),
  ]);

  return {
    Provider,
    storeFactory: resolverStoreFactory,
    ResolverWithoutProviders,
    mocks: {
      dataAccessLayer: {
        noAncestorsTwoChildren,
      },
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * These exports are used by the plugin 'resolverTest' defined in x-pack's plugin_functional suite.
 */
import { Provider } from 'react-redux';
import { resolverStoreFactory } from './store/index';
import { ResolverWithoutProviders } from './view/resolver_without_providers';
import { ResolverPluginSetup } from './types';
import { noAncestorsTwoChildren } from './data_access_layer/mocks/no_ancestors_two_children';

/**
 * Provide access to Resolver APIs.
 */
export function resolverPluginSetup(): ResolverPluginSetup {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Provider } from 'react-redux';
import { ResolverPluginSetup } from './types';
import { resolverStoreFactory } from './store/index';
import { ResolverWithoutProviders } from './view/resolver_without_providers';
import { noAncestorsTwoChildren } from './data_access_layer/mocks/no_ancestors_two_children';

/**
 * These exports are used by the plugin 'resolverTest' defined in x-pack's plugin_functional suite.
 */

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

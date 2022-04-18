/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Provider } from 'react-redux';
import { ResolverPluginSetup } from './types';
import { resolverStoreFactory } from './store';
import { ResolverWithoutProviders } from './view/resolver_without_providers';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from './data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';

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
        noAncestorsTwoChildrenWithRelatedEventsOnOrigin,
      },
    },
  };
}

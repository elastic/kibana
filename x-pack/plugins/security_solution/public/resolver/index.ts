/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * These exports are used by the plugin 'resolverTest' defined in x-pack's plugin_functional suite.
 */
export { resolverStoreFactory } from './store/index';
export { ResolverWithoutProviders } from './view/resolver_without_providers';
export { noAncestorsTwoChildren as resolverMockDataAccessLayerWithNoAncestorsTwoChildren } from './data_access_layer/mocks/no_ancestors_two_children';

/**
 * Provide access to the instance of `Provider` that Resolver recognizes.
 */
export { Provider as ResolverReduxProvider } from 'react-redux';

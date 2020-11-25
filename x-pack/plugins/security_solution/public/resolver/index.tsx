/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Provider } from 'react-redux';
import React, { useContext, useMemo } from 'react';
import { DataAccessLayer, ResolverPluginSetup, ResolverProps } from './types';
import { resolverStoreFactory } from './store/index';
import { ResolverWithoutProviders } from './view/resolver_without_providers';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from './data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { SideEffectContext } from './view/side_effect_context';

/**
 * These exports are used by the plugin 'resolverTest' defined in x-pack's plugin_functional suite.
 */

/**
 * Provide access to Resolver APIs.
 */
export function resolverPluginSetup(): ResolverPluginSetup {
  return {
    ResolverFactory: (dataAccessLayer: DataAccessLayer) => {
      // eslint-disable-next-line react/display-name
      return React.forwardRef(function (props: ResolverProps, refToForward) {
        const { timestamp } = useContext(SideEffectContext);
        const store = useMemo(() => {
          return resolverStoreFactory({ dataAccessLayer, timestamp });
        }, [timestamp]);

        return (
          <Provider store={store}>
            <ResolverWithoutProviders {...props} />
          </Provider>
        );
      });
    },
    mocks: {
      dataAccessLayer: {
        noAncestorsTwoChildrenWithRelatedEventsOnOrigin,
      },
    },
  };
}

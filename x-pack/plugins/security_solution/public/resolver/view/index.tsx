/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useMemo, useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { resolverStoreFactory } from '../store';
import { StartServices } from '../../types';
import { DataAccessLayer, ResolverProps } from '../types';
import { dataAccessLayerFactory } from '../data_access_layer/factory';
import { ResolverWithoutProviders } from './resolver_without_providers';

/**
 * The `Resolver` component to use. This sets up the DataAccessLayer provider. Use `ResolverWithoutProviders` in tests or in other scenarios where you want to provide a different (or fake) data access layer.
 */
export const Resolver = React.memo((props: ResolverProps) => {
  const context = useKibana<StartServices>();
  const dataAccessLayer: DataAccessLayer = useMemo(
    () => dataAccessLayerFactory(context),
    [context]
  );

  const store = useMemo(() => resolverStoreFactory(dataAccessLayer), [dataAccessLayer]);

  const [activeStore, updateActiveStore] = useState(store);

  useEffect(() => {
    if (props.shouldUpdate) {
      updateActiveStore(resolverStoreFactory(dataAccessLayer));
    }
  }, [dataAccessLayer, props.shouldUpdate]);

  return (
    <Provider store={activeStore}>
      <ResolverWithoutProviders {...props} />
    </Provider>
  );
});

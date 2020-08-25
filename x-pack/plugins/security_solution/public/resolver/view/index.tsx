/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { resolverStoreFactory } from '../store';
import { StartServices } from '../../types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { DataAccessLayer, ResolverProps } from '../types';
import { dataAccessLayerFactory } from '../data_access_layer/factory';
import { ResolverWithoutProviders } from './resolver_without_providers';

/**
 * The `Resolver` component to use. This sets up the DataAccessLayer provider. Use `ResolverWithoutProviders` in tests or in other scenarios where you want to provide a different (or fake) data access layer.
 */
export const Resolver = React.memo((props: ResolverProps) => {
  const context = useKibana<StartServices>();
  const dataAccessLayer: DataAccessLayer = useMemo(() => dataAccessLayerFactory(context), [
    context,
  ]);

  const store = useMemo(() => {
    return resolverStoreFactory(dataAccessLayer);
  }, [dataAccessLayer]);

  return (
    <Provider store={store}>
      <ResolverWithoutProviders {...props} />
    </Provider>
  );
});

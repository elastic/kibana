/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */

import React, { useMemo, useContext } from 'react';
import { Provider } from 'react-redux';
import { ResolverMap } from './map';
import { storeFactory } from '../store';
import { StartServices } from '../../types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { DataAccessLayerContext } from '../data_access_layer/context';
import { DataAccessLayer } from '../types';
import { dataAccessLayerFactory } from '../data_access_layer/factory';

/**
 * The `Resolver` component to use. This sets up the DataAccessLayer provider. Use `ResolverWithoutDataAccessLayer` in tests or in other scenarios where you want to provide a different (or fake) data access layer.
 */
export const Resolver = React.memo((props: ResolverProps) => {
  const context = useKibana<StartServices>();
  const dataAccessLayer = useMemo(() => dataAccessLayerFactory(context), [context]);
  return (
    <DataAccessLayerContext.Provider value={dataAccessLayer}>
      <ResolverWithoutDataAccessLayer {...props} />
    </DataAccessLayerContext.Provider>
  );
});

interface ResolverProps {
  /**
   * Used by `styled-components`.
   */
  className?: string;
  /**
   * The `_id` value of an event in ES.
   * Used as the origin of the Resolver graph.
   */
  databaseDocumentID?: string;
  /**
   * A string literal describing where in the app resolver is located,
   * used to prevent collisions in things like query params
   */
  resolverComponentInstanceID: string;
}

/**
 * Resolver component without a dataAccessLayer built in. This can't be used without a data access layer.
 */
export const ResolverWithoutDataAccessLayer = React.memo(function ({
  className,
  databaseDocumentID,
  resolverComponentInstanceID,
}: ResolverProps) {
  const dataAccessLayer: DataAccessLayer | null = useContext(DataAccessLayerContext);
  const store = useMemo(() => {
    if (dataAccessLayer === null) {
      // This component cannot work without a valid data access layer. The provider doesn't provide one by default, since provider defaults are statically defined and this needs access to the kibana context.
      throw new Error('Resolver is not configured correctly.');
    }

    return storeFactory(dataAccessLayer);
  }, [dataAccessLayer]);

  /**
   * Setup the store and use `Provider` here. This allows the ResolverMap component to
   * dispatch actions and read from state.
   */
  return (
    <Provider store={store}>
      <ResolverMap
        className={className}
        databaseDocumentID={databaseDocumentID}
        resolverComponentInstanceID={resolverComponentInstanceID}
      />
    </Provider>
  );
});

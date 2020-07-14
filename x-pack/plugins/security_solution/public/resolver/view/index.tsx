/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { ResolverMap } from './map';
import { storeFactory } from '../store';
import { StartServices } from '../../types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

/**
 * The top level, unconnected, Resolver component.
 */
export const Resolver = React.memo(function ({
  className,
  databaseDocumentID,
}: {
  /**
   * Used by `styled-components`.
   */
  className?: string;
  /**
   * The `_id` value of an event in ES.
   * Used as the origin of the Resolver graph.
   */
  databaseDocumentID?: string;
}) {
  const context = useKibana<StartServices>();
  const store = useMemo(() => {
    return storeFactory(context);
  }, [context]);

  /**
   * Setup the store and use `Provider` here. This allows the ResolverMap component to
   * dispatch actions and read from state.
   */
  return (
    <Provider store={store}>
      <ResolverMap className={className} databaseDocumentID={databaseDocumentID} />
    </Provider>
  );
});

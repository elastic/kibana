/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store } from 'redux';
import { Provider, useSelector } from 'react-redux';
import { ResolverState, ResolverAction } from '../types';
import * as selectors from '../store/selectors';

export const AppRoot: React.FC<{
  store: Store<ResolverState, ResolverAction>;
}> = React.memo(({ store }) => {
  return (
    <Provider store={store}>
      <Diagnostic />
    </Provider>
  );
});

const Diagnostic: React.FC<{}> = React.memo(() => {
  const worldToRaster = useSelector(selectors.worldToRaster);
  return <div>frig</div>;
});

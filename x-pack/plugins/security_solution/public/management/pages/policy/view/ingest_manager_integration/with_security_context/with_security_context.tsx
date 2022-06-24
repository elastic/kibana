/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, memo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { StartPlugins } from '../../../../../../types';
import { createFleetContextReduxStore } from './store';
import { RenderContextProviders } from './render_context_providers';

interface WithSecurityContextProps<P extends {}> {
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  WrappedComponent: ComponentType<P>;
}

/**
 * Returns a new component that wraps the provided `WrappedComponent` in a bare minimum set of rendering context
 * needed to render Security Solution components that may be dependent on a Redux store and/or Security Solution
 * specific context based functionality
 *
 * @param coreStart
 * @param depsStart
 * @param WrappedComponent
 */
export const withSecurityContext = <P extends {}>({
  coreStart,
  depsStart,
  WrappedComponent,
}: WithSecurityContextProps<P>): ComponentType<P> => {
  let store: ReturnType<typeof createFleetContextReduxStore>; // created on first render

  return memo((props) => {
    if (!store) {
      store = createFleetContextReduxStore({ coreStart, depsStart });
    }

    return (
      <RenderContextProviders store={store} depsStart={depsStart}>
        <WrappedComponent {...props} />
      </RenderContextProviders>
    );
  });
};

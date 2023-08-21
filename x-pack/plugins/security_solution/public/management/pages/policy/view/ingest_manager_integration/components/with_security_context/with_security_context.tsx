/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React, { memo } from 'react';
import { createFleetContextReduxStore } from './store';
import { RenderContextProviders } from './render_context_providers';
import type { FleetUiExtensionGetterOptions } from '../../types';

interface WithSecurityContextProps<P extends {}> extends FleetUiExtensionGetterOptions {
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
  services: { upsellingService },
  WrappedComponent,
}: WithSecurityContextProps<P>): ComponentType<P> => {
  let store: ReturnType<typeof createFleetContextReduxStore>; // created on first render

  // eslint-disable-next-line react/display-name
  return memo((props) => {
    if (!store) {
      store = createFleetContextReduxStore({ coreStart, depsStart });
    }

    return (
      <RenderContextProviders
        store={store}
        depsStart={depsStart}
        upsellingService={upsellingService}
      >
        <WrappedComponent {...props} />
      </RenderContextProviders>
    );
  });
};

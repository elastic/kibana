/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, lazy, LazyExoticComponent, Suspense } from 'react';
import type { App } from './components/app';
import { PlaygroundProviderProps } from './providers/playground_provider';
import type { Toolbar } from './components/toolbar';

const lazyRender =
  <P extends {}>(
    Component: LazyExoticComponent<ComponentType<P>>
  ): React.FC<React.ComponentProps<typeof Component>> =>
  (props) =>
    (
      <Suspense fallback={null}>
        <Component {...props} />
      </Suspense>
    );

export const Playground = lazyRender<React.ComponentProps<typeof App>>(
  lazy<typeof App>(async () => ({
    default: (await import('./components/app')).App,
  }))
);

export const PlaygroundToolbar = lazyRender<React.ComponentProps<typeof Toolbar>>(
  lazy<typeof Toolbar>(async () => ({
    default: (await import('./components/toolbar')).Toolbar,
  }))
);

export const PlaygroundProvider = lazyRender<PlaygroundProviderProps>(
  lazy(async () => ({
    default: (await import('./providers/playground_provider')).PlaygroundProvider,
  }))
);

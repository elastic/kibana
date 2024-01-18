/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, ForwardedRef, lazy, PropsWithoutRef, Suspense } from 'react';

type LoadableComponent<TProps extends {}> = () => Promise<{
  default: ComponentType<TProps>;
}>;

/**
 * Options for the lazy loaded component
 */
interface DynamicOptions {
  /* Fallback UI element to use when loading the component */
  fallback?: React.ReactNode;
}

/**
 * Lazy load and wrap with Suspense any component.
 *
 * @example
 * const Header = dynamic(() => import('./components/header'))
 */
export function dynamic<TProps = {}, TRef = {}>(
  loader: LoadableComponent<TProps>,
  options: DynamicOptions = {}
) {
  const Component = lazy(loader);

  return React.forwardRef((props: PropsWithoutRef<TProps>, ref: ForwardedRef<TRef>) => (
    <Suspense fallback={options.fallback ?? null}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));
}

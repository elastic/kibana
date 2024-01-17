/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, ComponentType, lazy, Suspense } from 'react';

type LoadableComponent<TComponent extends ComponentType<any>> = () => Promise<{
  default: TComponent;
}>;

interface DynamicOptions {
  fallback?: React.ReactNode;
}

/**
 * Lazy load and wrap with Suspense any component.
 *
 * @example
 * const Header = dynamic(() => import('./components/header'))
 */
export function dynamic<TComponent extends ComponentType<any>>(
  loader: LoadableComponent<TComponent>,
  options: DynamicOptions = {}
) {
  const Component = lazy(loader);

  return (props: ComponentProps<TComponent>) => (
    <Suspense fallback={options.fallback ?? null}>
      <Component {...props} />
    </Suspense>
  );
}

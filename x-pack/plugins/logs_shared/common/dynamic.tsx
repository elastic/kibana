/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';

type LoadableComponent = () => Promise<{
  default: React.ComponentType<any>;
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
export function dynamic(loader: LoadableComponent, options: DynamicOptions = {}) {
  const Component = lazy(loader);

  return (props: any) => (
    <Suspense fallback={options.fallback ?? null}>
      <Component {...props} />
    </Suspense>
  );
}

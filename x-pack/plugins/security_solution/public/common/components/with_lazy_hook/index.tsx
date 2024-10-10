/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

export const withLazyHook = <D extends {}, P extends {}>(
  Component: React.ComponentType<PropsWithChildren<D & P>>,
  moduleImport: () => Promise<P>,
  fallback: React.ReactNode = null
) => {
  return React.memo(function WithLazy(props: D) {
    const [lazyModuleProp, setLazyModuleProp] = useState<P>();

    useEffect(() => {
      moduleImport().then((module) => {
        setLazyModuleProp(() => module);
      });
    }, []);

    return lazyModuleProp ? <Component {...lazyModuleProp} {...props} /> : <>{fallback}</>;
  });
};

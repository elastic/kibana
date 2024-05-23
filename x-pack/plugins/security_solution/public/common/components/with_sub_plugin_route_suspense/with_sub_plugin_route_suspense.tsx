/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingLogo } from '@elastic/eui';
import type { ComponentType } from 'react';
import React, { Suspense } from 'react';

const centerLogoStyle = { display: 'flex', margin: 'auto' };

const defaultFallback = <EuiLoadingLogo logo="logoSecurity" size="xl" style={centerLogoStyle} />;

export const withSubPluginRouteSuspense = <T extends {} = {}>(
  WrappedComponent: ComponentType<T>,
  fallback: React.ReactNode = defaultFallback
) =>
  function WithSubPluginRouteSuspense(props: T) {
    return (
      <Suspense fallback={fallback}>
        <WrappedComponent {...props} />
      </Suspense>
    );
  };

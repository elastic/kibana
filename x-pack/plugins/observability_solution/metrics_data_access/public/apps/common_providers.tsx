/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React from 'react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { useKibanaContextForPluginProvider } from '../hooks/use_kibana';

export interface CoreProvidersProps {
  children?: React.ReactNode;
  core: CoreStart;
}

export const CoreProviders: React.FC<CoreProvidersProps> = ({ children, core }) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core);

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProviderForPlugin services={{ ...core }}>
        {children}
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};

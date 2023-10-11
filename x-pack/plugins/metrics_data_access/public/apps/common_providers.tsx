/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { useKibanaContextForPluginProvider } from '../hooks/use_kibana';

export interface CoreProvidersProps {
  core: CoreStart;
  theme$: AppMountParameters['theme$'];
}

export const CoreProviders: React.FC<CoreProvidersProps> = ({ children, core, theme$ }) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core);

  return (
    <KibanaContextProviderForPlugin services={{ ...core }}>
      <core.i18n.Context>
        <KibanaThemeProvider theme$={theme$}>{children}</KibanaThemeProvider>
      </core.i18n.Context>
    </KibanaContextProviderForPlugin>
  );
};

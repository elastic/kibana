/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiPageTemplate } from '@elastic/eui';

import { App } from './components/app';
import { useKibana } from './hooks/use_kibana';
import { InferenceEndpointsProvider } from './providers/inference_endpoints_provider';

export const InferenceEndpointsOverview: React.FC = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <InferenceEndpointsProvider>
      <EuiPageTemplate offset={0} restrictWidth={false} grow={false}>
        <App />
        {embeddableConsole}
      </EuiPageTemplate>
    </InferenceEndpointsProvider>
  );
};

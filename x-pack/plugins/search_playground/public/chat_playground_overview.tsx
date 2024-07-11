/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './utils/query_client';
import { PlaygroundProvider } from './providers/playground_provider';

import { App } from './components/app';
import { useKibana } from './hooks/use_kibana';

export const ChatPlaygroundOverview: React.FC = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PlaygroundProvider>
        <EuiPageTemplate
          offset={0}
          restrictWidth={false}
          data-test-subj="svlPlaygroundPage"
          grow={false}
          panelled={false}
        >
          <App showDocs />
          {embeddableConsole}
        </EuiPageTemplate>
      </PlaygroundProvider>
    </QueryClientProvider>
  );
};

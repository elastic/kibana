/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { PlaygroundProvider } from './providers/playground_provider';

import { useKibana } from './hooks/use_kibana';
import { QueryBuilderApp } from './components/query_builder_app';

export const QueryBuilderOverview: React.FC = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <PlaygroundProvider>
      <EuiPageTemplate
        offset={0}
        restrictWidth={false}
        data-test-subj="svlQueryBuilderPage"
        grow={false}
        panelled={false}
      >
        <QueryBuilderApp showDocs />
        {embeddableConsole}
      </EuiPageTemplate>
    </PlaygroundProvider>
  );
};

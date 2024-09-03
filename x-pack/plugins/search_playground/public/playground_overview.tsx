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
import { PlaygroundPageMode } from './types';
import { App } from './components/app';

interface PlaygroundOverviewProps {
  pageMode?: PlaygroundPageMode;
}
export const PlaygroundOverview: React.FC<PlaygroundOverviewProps> = ({
  pageMode = PlaygroundPageMode.chat,
}) => {
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
        data-test-subj="svlPlaygroundPage"
        grow={false}
        panelled={false}
      >
        <App showDocs pageMode={pageMode} />
        {embeddableConsole}
      </EuiPageTemplate>
    </PlaygroundProvider>
  );
};

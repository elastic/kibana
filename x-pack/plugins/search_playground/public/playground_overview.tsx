/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PlaygroundProvider } from './providers/playground_provider';

import { useKibana } from './hooks/use_kibana';
import { PlaygroundPageMode } from './types';
import { App } from './components/app';
import { usePlaygroundBreadcrumbs } from './hooks/use_playground_breadcrumbs';

interface PlaygroundOverviewProps {
  pageMode?: PlaygroundPageMode;
}
export const PlaygroundOverview: React.FC<PlaygroundOverviewProps> = ({
  pageMode = PlaygroundPageMode.chat,
}) => {
  const {
    services: { history, console: consolePlugin, searchNavigation },
  } = useKibana();
  usePlaygroundBreadcrumbs();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <PlaygroundProvider>
      <KibanaPageTemplate
        offset={0}
        restrictWidth={false}
        data-test-subj="svlPlaygroundPage"
        grow={false}
        panelled={false}
        solutionNav={searchNavigation?.useClassicNavigation(history)}
      >
        <App showDocs pageMode={pageMode} />
        {embeddableConsole}
      </KibanaPageTemplate>
    </PlaygroundProvider>
  );
};

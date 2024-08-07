/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useWatch } from 'react-hook-form';
import { Header } from './header';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { ChatForm, ChatFormFields, PlaygroundPageMode } from '../types';
import { SearchMode } from './search_mode/search_mode';
import { QueryBuilderSetupPage } from './setup_page/query_builder_setup_page';
import { QueryBuilderMode } from './query_builder_mode/query_builder_mode';
import { AppProps, ViewMode } from './app';
import { useKibana } from '../hooks/use_kibana';
import { SEARCH_PLAYGROUND_APP_ID, SEARCH_PLAYGROUND_CHAT_PATH } from '../routes';

export const QueryBuilderApp: React.FC<AppProps> = ({ showDocs = false }) => {
  const {
    services: { application },
  } = useKibana();

  const [showSetupPage, setShowSetupPage] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ViewMode>(ViewMode.chat);
  const [selectedPageMode, setSelectedPageMode] = useState<PlaygroundPageMode>('query_builder');
  const { data: connectors } = useLoadConnectors();
  const hasSelectedIndices = useWatch<ChatForm, ChatFormFields.indices>({
    name: ChatFormFields.indices,
  }).length;
  const handleModeChange = (id: ViewMode) => setSelectedMode(id);
  const handlePageModeChange = useCallback(
    async (mode: PlaygroundPageMode) => {
      setSelectedPageMode(mode);
      if (mode === 'chat')
        application?.navigateToApp(SEARCH_PLAYGROUND_APP_ID + SEARCH_PLAYGROUND_CHAT_PATH);
    },
    [application, setSelectedPageMode]
  );

  useEffect(() => {
    if (showSetupPage && hasSelectedIndices) {
      setShowSetupPage(false);
    } else if (!showSetupPage && !hasSelectedIndices) {
      setShowSetupPage(true);
    }
  }, [connectors, hasSelectedIndices, showSetupPage]);

  return (
    <>
      <Header
        showDocs={showDocs}
        onModeChange={handleModeChange}
        selectedMode={selectedMode}
        isActionsDisabled={showSetupPage}
        selectedPageMode={selectedPageMode}
        onSelectPageModeChange={handlePageModeChange}
      />
      <KibanaPageTemplate.Section
        alignment="top"
        restrictWidth={selectedMode === 'chat' ? true : false}
        grow
        css={{
          position: 'relative',
        }}
        contentProps={{ css: { display: 'flex', flexGrow: 1, position: 'absolute', inset: 0 } }}
        paddingSize={selectedMode === 'chat' ? 'xl' : 'none'}
        className="eui-fullHeight"
      >
        {showSetupPage && <QueryBuilderSetupPage />}
        {!showSetupPage && (
          <>
            {selectedMode === ViewMode.chat && <SearchMode />}
            {selectedMode === ViewMode.query && <QueryBuilderMode />}
          </>
        )}
      </KibanaPageTemplate.Section>
    </>
  );
};

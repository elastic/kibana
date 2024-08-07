/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useWatch } from 'react-hook-form';
import { ChatSetupPage } from './setup_page/chat_setup_page';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { ChatForm, ChatFormFields, PlaygroundPageMode } from '../types';
import { AppProps, ViewMode } from './app';
import { QueryMode } from './query_mode/query_mode';
import { Chat } from './chat';
import { Header } from './header';
import { useKibana } from '../hooks/use_kibana';
import { SEARCH_PLAYGROUND_APP_ID, SEARCH_PLAYGROUND_QUERY_BUILDER_PATH } from '../routes';

export const ChatPlaygroundApp: React.FC<AppProps> = ({ showDocs = false }) => {
  const {
    services: { application },
  } = useKibana();

  const [showSetupPage, setShowSetupPage] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ViewMode>(ViewMode.chat);
  const [selectedPageMode, setSelectedPageMode] = useState<PlaygroundPageMode>('chat');
  const { data: connectors } = useLoadConnectors();
  const hasSelectedIndices = useWatch<ChatForm, ChatFormFields.indices>({
    name: ChatFormFields.indices,
  }).length;
  const handleModeChange = (id: ViewMode) => setSelectedMode(id);
  const handlePageModeChange = useCallback(
    async (mode: PlaygroundPageMode) => {
      setSelectedPageMode(mode);
      if (mode === 'query_builder')
        application?.navigateToApp(SEARCH_PLAYGROUND_APP_ID + SEARCH_PLAYGROUND_QUERY_BUILDER_PATH);
    },
    [application, setSelectedPageMode]
  );

  useEffect(() => {
    if (showSetupPage && connectors?.length && hasSelectedIndices) {
      setShowSetupPage(false);
    } else if (!showSetupPage && (!connectors?.length || !hasSelectedIndices)) {
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
        restrictWidth={false}
        grow
        css={{
          position: 'relative',
        }}
        contentProps={{ css: { display: 'flex', flexGrow: 1, position: 'absolute', inset: 0 } }}
        paddingSize="none"
        className="eui-fullHeight"
      >
        {showSetupPage && <ChatSetupPage />}
        {!showSetupPage && selectedMode === ViewMode.chat && <Chat />}
        {!showSetupPage && selectedMode === ViewMode.query && <QueryMode />}
      </KibanaPageTemplate.Section>
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useWatch } from 'react-hook-form';
import { QueryMode } from './query_mode/query_mode';
import { ChatSetupPage } from './setup_page/chat_setup_page';
import { Header } from './header';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { ChatForm, ChatFormFields, PlaygroundPageMode } from '../types';
import { Chat } from './chat';
import { SearchMode } from './search_mode/search_mode';
import { QueryBuilderSetupPage } from './setup_page/query_builder_setup_page';
import { QueryBuilderMode } from './query_builder_mode/query_builder_mode';

export interface AppProps {
  showDocs?: boolean;
  pageMode?: PlaygroundPageMode;
}

export enum ViewMode {
  chat = 'chat',
  query = 'query',
}

export const App: React.FC<AppProps> = ({ showDocs = false, pageMode = 'chat' }) => {
  const [showSetupPage, setShowSetupPage] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ViewMode>(ViewMode.chat);
  const [selectedPageMode, setSelectedPageMode] = useState<PlaygroundPageMode>(pageMode);
  const { data: connectors } = useLoadConnectors();
  const hasSelectedIndices = useWatch<ChatForm, ChatFormFields.indices>({
    name: ChatFormFields.indices,
  }).length;
  const handleModeChange = (id: ViewMode) => setSelectedMode(id);
  const handlePageModeChange = (mode: PlaygroundPageMode) => setSelectedPageMode(mode);

  useEffect(() => {
    if (selectedPageMode === 'chat') {
      if (showSetupPage && connectors?.length && hasSelectedIndices) {
        setShowSetupPage(false);
      } else if (!showSetupPage && (!connectors?.length || !hasSelectedIndices)) {
        setShowSetupPage(true);
      }
    } else {
      if (showSetupPage && hasSelectedIndices) {
        setShowSetupPage(false);
      } else if (!showSetupPage && !hasSelectedIndices) {
        setShowSetupPage(true);
      }
    }
  }, [connectors, hasSelectedIndices, showSetupPage, selectedPageMode]);

  const getSetupPage = () => {
    return (
      showSetupPage && (
        <>
          {selectedPageMode === 'chat' && <ChatSetupPage />}
          {selectedPageMode === 'query_builder' && <QueryBuilderSetupPage />}
        </>
      )
    );
  };
  const getQueryBuilderPage = () => {
    return (
      !showSetupPage &&
      selectedPageMode === 'query_builder' && (
        <>
          {selectedMode === ViewMode.chat && <SearchMode />}
          {selectedMode === ViewMode.query && <QueryBuilderMode />}
        </>
      )
    );
  };
  const getChatPage = () => {
    return (
      !showSetupPage &&
      selectedPageMode === 'chat' && (
        <>
          {selectedMode === ViewMode.chat && <Chat />}
          {selectedMode === ViewMode.query && <QueryMode />}
        </>
      )
    );
  };

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
        restrictWidth={
          selectedPageMode === 'query_builder' && selectedMode === 'chat' ? true : false
        }
        grow
        css={{
          position: 'relative',
        }}
        contentProps={{ css: { display: 'flex', flexGrow: 1, position: 'absolute', inset: 0 } }}
        paddingSize={
          selectedPageMode === 'query_builder' && selectedMode === 'chat' ? 'xl' : 'none'
        }
        className="eui-fullHeight"
      >
        {getSetupPage()}
        {getChatPage()}
        {getQueryBuilderPage()}
      </KibanaPageTemplate.Section>
    </>
  );
};

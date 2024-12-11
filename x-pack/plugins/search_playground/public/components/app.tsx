/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useWatch } from 'react-hook-form';
import { QueryMode } from './query_mode/query_mode';
import { ChatSetupPage } from './setup_page/chat_setup_page';
import { Header } from './header';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { ChatForm, ChatFormFields, PlaygroundPageMode } from '../types';
import { Chat } from './chat';
import { SearchMode } from './search_mode/search_mode';
import { SearchPlaygroundSetupPage } from './setup_page/search_playground_setup_page';
import { usePageMode } from '../hooks/use_page_mode';
import { useKibana } from '../hooks/use_kibana';

export interface AppProps {
  showDocs?: boolean;
  pageMode?: 'chat' | 'search';
}

export enum ViewMode {
  chat = 'chat',
  query = 'query',
}

export const App: React.FC<AppProps> = ({
  showDocs = false,
  pageMode = PlaygroundPageMode.chat,
}) => {
  const { services } = useKibana();
  const [selectedMode, setSelectedMode] = useState<ViewMode>(ViewMode.chat);
  const { data: connectors } = useLoadConnectors();
  const hasSelectedIndices = Boolean(
    useWatch<ChatForm, ChatFormFields.indices>({
      name: ChatFormFields.indices,
    }).length
  );
  const handleModeChange = (id: ViewMode) => setSelectedMode(id);
  const handlePageModeChange = (mode: PlaygroundPageMode) => {
    services.application?.navigateToUrl(`./${mode}`);
    setSelectedPageMode(mode);
  };
  const {
    showSetupPage,
    pageMode: selectedPageMode,
    setPageMode: setSelectedPageMode,
  } = usePageMode({
    hasSelectedIndices,
    hasConnectors: Boolean(connectors?.length),
    initialPageMode: pageMode === 'chat' ? PlaygroundPageMode.chat : PlaygroundPageMode.search,
  });

  const restrictedWidth = selectedPageMode === PlaygroundPageMode.search && selectedMode === 'chat';
  const paddingSize =
    selectedPageMode === PlaygroundPageMode.search && selectedMode === 'chat' ? 'xl' : 'none';

  const getSetupPage = () => {
    return (
      showSetupPage && (
        <>
          {selectedPageMode === PlaygroundPageMode.chat && <ChatSetupPage />}
          {selectedPageMode === PlaygroundPageMode.search && <SearchPlaygroundSetupPage />}
        </>
      )
    );
  };
  const getQueryBuilderPage = () => {
    return (
      !showSetupPage &&
      selectedPageMode === PlaygroundPageMode.search && (
        <>
          {selectedMode === ViewMode.chat && <SearchMode />}
          {selectedMode === ViewMode.query && <QueryMode />}
        </>
      )
    );
  };
  const getChatPage = () => {
    return (
      !showSetupPage &&
      selectedPageMode === PlaygroundPageMode.chat && (
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
        restrictWidth={restrictedWidth}
        grow
        css={{
          position: 'relative',
        }}
        contentProps={
          selectedPageMode === PlaygroundPageMode.search && selectedMode === 'chat'
            ? undefined
            : { css: { display: 'flex', flexGrow: 1, position: 'absolute', inset: 0 } }
        }
        paddingSize={paddingSize}
        className="eui-fullHeight"
      >
        {getSetupPage()}
        {getChatPage()}
        {getQueryBuilderPage()}
      </KibanaPageTemplate.Section>
    </>
  );
};

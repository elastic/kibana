/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useFormContext } from 'react-hook-form';
import { QueryMode } from './query_mode/query_mode';
import { SetupPage } from './setup_page/setup_page';
import { Header } from './header';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { ChatForm, ChatFormFields } from '../types';
import { Chat } from './chat';

export interface AppProps {
  showDocs?: boolean;
}

export enum ViewMode {
  chat = 'chat',
  query = 'query',
}

export const App: React.FC<AppProps> = ({ showDocs = false }) => {
  const [showSetupPage, setShowSetupPage] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ViewMode>(ViewMode.chat);
  const { watch } = useFormContext<ChatForm>();
  const { data: connectors } = useLoadConnectors();
  const hasSelectedIndices = watch(ChatFormFields.indices).length;
  const handleModeChange = (id: string) => setSelectedMode(id as ViewMode);

  useEffect(() => {
    if (showSetupPage && connectors?.length && hasSelectedIndices) {
      setShowSetupPage(false);
    }
  }, [connectors, hasSelectedIndices, showSetupPage]);

  return (
    <>
      <Header
        showDocs={showDocs}
        onModeChange={handleModeChange}
        selectedMode={selectedMode}
        isActionsDisabled={showSetupPage}
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
        {showSetupPage ? <SetupPage /> : selectedMode === ViewMode.chat ? <Chat /> : <QueryMode />}
      </KibanaPageTemplate.Section>
    </>
  );
};

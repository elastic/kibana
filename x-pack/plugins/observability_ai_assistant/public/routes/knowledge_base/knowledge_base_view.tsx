/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistantParams } from '../../hooks/use_observability_ai_assistant_params';
import { KnowledgeBaseEntryList } from '../../components/knowledge_base/knowledge_base_entry_list';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { SelectEntryPanel } from '../../components/knowledge_base/select_entry_panel';
import { NewEntryFlyout } from '../../components/knowledge_base/new_entry_flyout';
import { EntryPanel } from '../../components/knowledge_base/entry_panel';
import type { KnowledgeBaseEntry } from '../../../common/types';

const containerClassName = css`
  max-width: 100%;
`;

const conversationListContainerName = css`
  min-width: 250px;
  width: 250px;
  border-right: solid 1px ${euiThemeVars.euiColorLightShade};
`;

export function KnowledgeBaseView() {
  const { push } = useObservabilityAIAssistantRouter();
  const { path } = useObservabilityAIAssistantParams('/knowledge-base/*');

  const entryId = 'kbEntryId' in path ? path.kbEntryId : undefined;

  const { getEntries } = useKnowledgeBase();

  const [loading, setLoading] = useState(false);

  const [stateEntries, setStateEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | undefined>(undefined);

  const [flyoutOpen, setIsFlyoutOpen] = useState(false);

  const handleRefreshEntryList = useCallback(() => {
    setLoading(true);
    getEntries().then(({ entries }) => {
      setStateEntries(entries);
      setLoading(false);
    });
  }, [getEntries]);

  useEffect(() => {
    handleRefreshEntryList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (entryId && stateEntries.length && selectedEntry?.id !== entryId) {
      const entry = stateEntries.find(({ id }) => id === entryId);
      if (entry) {
        setSelectedEntry(entry);
      } else {
        push('/knowledge-base', {
          path: {},
          query: {},
        });
      }
    }
  }, [entryId, push, selectedEntry?.id, stateEntries]);

  const handleClickNewEntry = useCallback(() => {
    push('/knowledge-base', { path: {}, query: {} });
    setIsFlyoutOpen(true);
  }, [push]);

  return (
    <>
      {flyoutOpen ? (
        <NewEntryFlyout
          onRefreshList={handleRefreshEntryList}
          onClose={() => setIsFlyoutOpen(false)}
        />
      ) : null}
      <EuiFlexGroup direction="row" className={containerClassName} gutterSize="none">
        <EuiFlexItem grow={false} className={conversationListContainerName}>
          <KnowledgeBaseEntryList
            entries={stateEntries}
            selected={entryId ?? ''}
            loading={loading}
            onClickNewEntry={handleClickNewEntry}
            onRefreshList={handleRefreshEntryList}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {entryId ? (
            <EntryPanel
              loading={loading}
              entry={selectedEntry}
              onRefreshList={handleRefreshEntryList}
            />
          ) : (
            <SelectEntryPanel />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

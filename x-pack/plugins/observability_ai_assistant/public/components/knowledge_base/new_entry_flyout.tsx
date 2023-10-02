/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';

export function NewEntryFlyout({
  onClose,
  onRefreshList,
}: {
  onClose: () => void;
  onRefreshList: () => void;
}) {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [newEntryId, setNewEntryId] = useState('');
  const [newEntryText, setNewEntryText] = useState('');

  const [saving, setSaving] = useState(false);

  const { saveEntry } = useKnowledgeBase();

  const handleSaveNewEntry = () => {
    setSaving(true);
    saveEntry({
      body: {
        id: newEntryId,
        confidence: 'high',
        text: newEntryText,
        is_correction: false,
        public: true,
        labels: {},
      },
    })
      .then(() => {
        toasts.addSuccess({ title: 'Entry saved' });
        onClose();
        setTimeout(() => {
          onRefreshList();
        }, 500);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>New entry</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <strong>ID</strong>
        </EuiText>
        <EuiFieldText
          data-test-subj="observabilityAiAssistantKnowledgeBaseViewFieldText"
          value={newEntryId}
          onChange={(e) => setNewEntryId(e.target.value)}
        />
        <EuiSpacer size="l" />
        <EuiText>
          <strong>Contents</strong>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiMarkdownEditor
          aria-label="observabilityAiAssistantKnowledgeBaseViewMarkdownEditor"
          height={400}
          initialViewMode="editing"
          readOnly={false}
          placeholder="Enter contents"
          value={newEntryText}
          onChange={(text) => setNewEntryText(text)}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton
          data-test-subj="observabilityAiAssistantKnowledgeBaseViewSaveButton"
          disabled={!newEntryText}
          fill
          iconType="save"
          isLoading={saving}
          onClick={handleSaveNewEntry}
        >
          Save
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

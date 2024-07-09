/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import {
  KnowledgeBaseEntry,
  KnowledgeBaseType,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useCreateKnowledgeBaseEntry } from '../../hooks/use_create_knowledge_base_entry';

export function KnowledgeBaseEditSystemPromptFlyout({
  entry,
  onClose,
}: {
  entry: KnowledgeBaseEntry | undefined;
  onClose: () => void;
}) {
  const { mutateAsync: createEntry, isLoading } = useCreateKnowledgeBaseEntry();
  const [newEntryText, setNewEntryText] = useState(entry?.text ?? '');
  const isFormInvalid = newEntryText.trim() === '';
  const isPublic = false;

  const handleSubmit = async () => {
    await createEntry({
      entry: {
        id: entry?.id ?? uuidv4(),
        text: newEntryText,
        public: isPublic,
        type: KnowledgeBaseType.UserInstruction,
      },
    });

    onClose();
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder data-test-subj="knowledgeBaseManualEntryFlyout">
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseNewEntryFlyout.h2.editEntryLabel',
              { defaultMessage: 'Edit system prompt' }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseNewEntryFlyout.h5.editEntryLabel',
              { defaultMessage: 'Personal system prompt' }
            )}
          </h5>
        </EuiTitle>

        <EuiText>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseEditSystemPromptFlyout.personalPromptTextLabel',
            {
              defaultMessage:
                'This prompt will be appended to the system prompt. Is will only be used for you and not shared with other users',
            }
          )}
        </EuiText>

        <EuiSpacer size="s" />

        <EuiFormRow fullWidth>
          <EuiMarkdownEditor
            editorId="knowledgeBaseEditManualEntryFlyoutMarkdownEditor"
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseNewManualEntryFlyout.euiMarkdownEditor.observabilityAiAssistantKnowledgeBaseViewMarkdownEditorLabel',
              { defaultMessage: 'observabilityAiAssistantKnowledgeBaseViewMarkdownEditor' }
            )}
            height={300}
            initialViewMode="editing"
            readOnly={false}
            placeholder={i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiMarkdownEditor.enterContentsLabel',
              { defaultMessage: 'Enter contents' }
            )}
            value={newEntryText}
            onChange={(text) => setNewEntryText(text)}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="knowledgeBaseEditManualEntryFlyoutCancelButton"
              disabled={isLoading}
              onClick={onClose}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseNewManualEntryFlyout.cancelButtonEmptyLabel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="knowledgeBaseEditManualEntryFlyoutSaveButton"
              fill
              isLoading={isLoading}
              onClick={handleSubmit}
              isDisabled={isFormInvalid}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseNewManualEntryFlyout.saveButtonLabel',
                { defaultMessage: 'Save' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

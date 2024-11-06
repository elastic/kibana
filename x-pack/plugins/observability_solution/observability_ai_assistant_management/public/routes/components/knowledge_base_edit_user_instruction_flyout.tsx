/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
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
import { useGetUserInstructions } from '../../hooks/use_get_user_instructions';
import { useCreateKnowledgeBaseUserInstruction } from '../../hooks/use_create_knowledge_base_user_instruction';

export function KnowledgeBaseEditUserInstructionFlyout({ onClose }: { onClose: () => void }) {
  const { userInstructions, isLoading: isFetching } = useGetUserInstructions();
  const { mutateAsync: createEntry, isLoading: isSaving } = useCreateKnowledgeBaseUserInstruction();
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryDocId, setNewEntryDocId] = useState<string>();
  const isSubmitDisabled = newEntryText.trim() === '';

  useEffect(() => {
    const userInstruction = userInstructions?.find((entry) => !entry.public);
    setNewEntryDocId(userInstruction?.doc_id);
    setNewEntryText(userInstruction?.text ?? '');
  }, [userInstructions]);

  const handleSubmit = async () => {
    await createEntry({
      entry: {
        doc_id: newEntryDocId ?? uuidv4(),
        text: newEntryText,
        public: false, // limit user instructions to private (for now)
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
              'xpack.observabilityAiAssistantManagement.knowledgeBaseEditSystemPrompt.h2.editEntryLabel',
              { defaultMessage: 'AI User Profile' }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseEditSystemPromptFlyout.personalPromptTextLabel',
            {
              defaultMessage:
                'The AI User Profile will be appended to the system prompt. It is space-aware and will only be used for your prompts - not shared with other users.',
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
            readOnly={isFetching}
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
              disabled={isSaving}
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
              isLoading={isSaving}
              onClick={handleSubmit}
              isDisabled={isSubmitDisabled}
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

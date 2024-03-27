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
  EuiFieldText,
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
import moment from 'moment';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useCreateKnowledgeBaseEntry } from '../../hooks/use_create_knowledge_base_entry';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
import { useAppContext } from '../../hooks/use_app_context';

export function KnowledgeBaseEditManualEntryFlyout({
  entry,
  onClose,
}: {
  entry?: KnowledgeBaseEntry;
  onClose: () => void;
}) {
  const { uiSettings } = useAppContext();
  const dateFormat = uiSettings.get('dateFormat');

  const { mutateAsync: createEntry, isLoading } = useCreateKnowledgeBaseEntry();
  const { mutateAsync: deleteEntry, isLoading: isDeleting } = useDeleteKnowledgeBaseEntry();

  const [newEntryId, setNewEntryId] = useState(entry?.id ?? '');
  const [newEntryText, setNewEntryText] = useState(entry?.text ?? '');

  const handleSubmitNewEntryClick = async () => {
    createEntry({
      entry: {
        id: newEntryId,
        text: newEntryText,
      },
    }).then(onClose);
  };

  const handleDelete = async () => {
    await deleteEntry({ id: entry!.id });
    onClose();
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder data-test-subj="knowledgeBaseManualEntryFlyout">
        <EuiTitle>
          <h2>
            {!entry
              ? i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseNewEntryFlyout.h2.newEntryLabel',
                  {
                    defaultMessage: 'New entry',
                  }
                )
              : i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseNewEntryFlyout.h2.editEntryLabel',
                  {
                    defaultMessage: 'Edit {id}',
                    values: { id: entry.id },
                  }
                )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {!entry ? (
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiFormRow.idLabel',
              { defaultMessage: 'Name' }
            )}
          >
            <EuiFieldText
              data-test-subj="knowledgeBaseEditManualEntryFlyoutFieldText"
              fullWidth
              value={newEntryId}
              onChange={(e) => setNewEntryId(e.target.value)}
            />
          </EuiFormRow>
        ) : (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.createdOnTextLabel',
                  { defaultMessage: 'Created on' }
                )}
              </EuiText>
              <EuiText size="s">{moment(entry['@timestamp']).format(dateFormat)}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="knowledgeBaseEditManualEntryFlyoutDeleteEntryButton"
                color="danger"
                iconType="trash"
                isLoading={isDeleting}
                onClick={handleDelete}
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.deleteEntryButtonLabel',
                  { defaultMessage: 'Delete entry' }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiFormRow.contentsLabel',
            { defaultMessage: 'Contents' }
          )}
        >
          <EuiMarkdownEditor
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
              onClick={handleSubmitNewEntryClick}
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

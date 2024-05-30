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
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIconTip,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useCreateKnowledgeBaseEntry } from '../../hooks/use_create_knowledge_base_entry';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
import { useKibana } from '../../hooks/use_kibana';

export function KnowledgeBaseEditManualEntryFlyout({
  entry,
  onClose,
}: {
  entry?: KnowledgeBaseEntry;
  onClose: () => void;
}) {
  const { uiSettings } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');

  const { mutateAsync: createEntry, isLoading } = useCreateKnowledgeBaseEntry();
  const { mutateAsync: deleteEntry, isLoading: isDeleting } = useDeleteKnowledgeBaseEntry();

  const [isPublic, setIsPublic] = useState(entry?.public ?? false);

  const [newEntryId, setNewEntryId] = useState(entry?.id ?? '');
  const [newEntryText, setNewEntryText] = useState(entry?.text ?? '');

  const isEntryIdInvalid = newEntryId.trim() === '';
  const isEntryTextInvalid = newEntryText.trim() === '';
  const isFormInvalid = isEntryIdInvalid || isEntryTextInvalid;

  const handleSubmit = async () => {
    await createEntry({
      entry: {
        id: newEntryId,
        text: newEntryText,
        public: isPublic,
      },
    });

    onClose();
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
              data-test-subj="knowledgeBaseEditManualEntryFlyoutIdInput"
              fullWidth
              value={newEntryId}
              onChange={(e) => setNewEntryId(e.target.value)}
              isInvalid={isEntryIdInvalid}
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

        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiButtonGroup.visibilityLabel',
                { defaultMessage: 'Visibility' }
              )}
              options={[
                {
                  id: 'user',
                  label: i18n.translate(
                    'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiButtonGroup.userLabel',
                    { defaultMessage: 'User' }
                  ),
                },
                {
                  id: 'global',
                  label: i18n.translate(
                    'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiButtonGroup.globalLabel',
                    { defaultMessage: 'Global' }
                  ),
                },
              ]}
              idSelected={isPublic ? 'global' : 'user'}
              onChange={(optionId) => setIsPublic(optionId === 'global')}
              buttonSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content="Global entries will be available to all users. User entries will only be available to the author."
              position="top"
              type="iInCircle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiFormRow.contentsLabel',
            { defaultMessage: 'Contents' }
          )}
        >
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

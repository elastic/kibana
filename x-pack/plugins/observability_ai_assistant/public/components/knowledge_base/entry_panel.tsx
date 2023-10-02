/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownEditor,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import dedent from 'dedent';
import { i18n } from '@kbn/i18n';
import usePrevious from 'react-use/lib/usePrevious';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useKibana } from '../../hooks/use_kibana';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import type { KnowledgeBaseEntry } from '../../../common/types';
import { useConfirmModal } from '../../hooks/use_confirm_modal';

export function EntryPanel({
  entry,
  loading,
  onRefreshList,
}: {
  entry: KnowledgeBaseEntry | undefined;
  loading: boolean;
  onRefreshList: () => void;
}) {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const { push } = useObservabilityAIAssistantRouter();

  const { saveEntry, deleteEntry } = useKnowledgeBase();

  const prevEntryId = usePrevious(entry?.id);

  const [saving, setSaving] = useState(false);
  const [deleting, setIsDeleting] = useState(false);

  const [entryText, setEntryText] = useState<string | undefined>(undefined);

  const { element: confirmDeleteElement, confirm: confirmDeleteFunction } = useConfirmModal({
    title: i18n.translate('xpack.observabilityAiAssistant.confirmDeleteEntryTitle', {
      defaultMessage: 'Delete this entry?',
    }),
    children: i18n.translate('xpack.observabilityAiAssistant.confirmDeleteEntryContent', {
      defaultMessage: 'This action cannot be undone.',
    }),
    confirmButtonText: i18n.translate('xpack.observabilityAiAssistant.confirmDeleteButtonText', {
      defaultMessage: 'Delete entry',
    }),
  });

  useEffect(() => {
    if (entry?.id !== prevEntryId && entry) {
      setEntryText(dedent(entry.text));
    }
  }, [entry, prevEntryId]);

  const handleEntryTextChange = (text: string) => {
    setEntryText(text);
  };

  const handleSaveEntry = () => {
    if (entry) {
      setSaving(true);
      // @ts-expect-error
      const { score, ['@timestamp']: timeStamp, ...rest } = entry; // score is there in the object but not in the type
      saveEntry({ body: { ...rest, text: entryText ?? '' } })
        .then(() => toasts.addSuccess({ title: 'Entry saved' }))
        .finally(() => {
          setSaving(false);
        });
    }
  };

  const handleDeleteEntry = useCallback(
    (id: string) => {
      if (id) {
        setIsDeleting(true);
        confirmDeleteFunction().then(async (confirmed) => {
          if (!confirmed) {
            return;
          }
          deleteEntry(id)
            .then(() => {
              onRefreshList();
              push('/knowledge-base', {
                path: {},
                query: {},
              });
              toasts.addSuccess({ title: 'Entry deleted' });
            })
            .catch(() => {
              toasts.addDanger({ title: 'Error deleting entry' });
            })
            .finally(() => {
              setIsDeleting(false);
            });
        });
      }
    },
    [confirmDeleteFunction, deleteEntry, onRefreshList, push, toasts]
  );

  return (
    <>
      {confirmDeleteElement}
      <EuiPanel borderRadius="none" style={{ position: 'relative' }}>
        {loading ? (
          <>
            <EuiButtonIcon
              data-test-subj="observabilityAiAssistantKnowledgeBaseViewButton"
              iconType="cross"
              onClick={() => {
                push('/knowledge-base', {
                  path: {},
                  query: {},
                });
              }}
              style={{ position: 'absolute', right: '0', top: '0' }}
            />
            <EuiTitle>
              <h3>{entry?.id}</h3>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiDescriptionList compressed>
              <EuiDescriptionListTitle>Created on</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{entry?.['@timestamp']}</EuiDescriptionListDescription>

              <EuiDescriptionListTitle>Confidence</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiBadge
                  color={
                    entry?.confidence === 'high'
                      ? 'success'
                      : entry?.confidence === 'medium'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {entry?.confidence}
                </EuiBadge>
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>Is correction</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {entry?.is_correction ? 'Yes' : 'No'}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
            <EuiSpacer size="xl" />
            {entry?.text ? (
              <EuiMarkdownEditor
                aria-label="EUI markdown editor demo"
                placeholder="Your markdown here..."
                height={400}
                readOnly={false}
                initialViewMode="viewing"
                value={entryText ?? ''}
                onChange={handleEntryTextChange}
              />
            ) : null}
            <EuiSpacer size="xl" />

            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="observabilityAiAssistantKnowledgeBaseViewSaveButton"
                  disabled={!entry}
                  fill
                  iconType="save"
                  isLoading={saving}
                  onClick={handleSaveEntry}
                >
                  Save
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="observabilityAiAssistantKnowledgeBaseViewDeleteButton"
                  disabled={!entry || deleting}
                  color="danger"
                  iconType="trash"
                  isLoading={deleting}
                  onClick={() => handleDeleteEntry(entry?.id ?? '')}
                >
                  Delete
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <EuiLoadingSpinner size="l" />
        )}
      </EuiPanel>
    </>
  );
}

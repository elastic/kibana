/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { NewEntryButton } from '../buttons/new_entry_button';
import type { KnowledgeBaseEntry } from '../../../common/types';

const containerClassName = css`
  height: 100%;
`;

const titleClassName = css`
  text-transform: uppercase;
`;

const panelClassName = css`
  max-height: 100%;
`;

const overflowScrollClassName = css`
  overflow-y: auto;
`;

const newChatButtonWrapperClassName = css`
  padding-bottom: 5px;
`;

export function KnowledgeBaseEntryList({
  selected,
  loading,
  error,
  entries,
  onClickNewEntry,
  onRefreshList,
}: {
  selected: string;
  loading: boolean;
  error?: any;
  entries?: KnowledgeBaseEntry[];
  onClickNewEntry: () => void;
  onRefreshList: () => void;
}) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { link, push } = useObservabilityAIAssistantRouter();

  const { deleteEntry } = useKnowledgeBase();

  const [deleting, setIsDeleting] = useState(false);

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
            })
            .then(() => toasts.addSuccess({ title: 'Entry deleted' }))
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
      <EuiPanel paddingSize="s" hasShadow={false} className={panelClassName}>
        <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
          <EuiFlexItem grow className={overflowScrollClassName}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                  <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSpacer size="s" />
                      <EuiText className={titleClassName} size="s">
                        <strong>
                          {i18n.translate('xpack.observabilityAiAssistant.conversationList.title', {
                            defaultMessage: 'Knowledge base entries',
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    {loading ? (
                      <EuiFlexItem grow={false}>
                        <EuiLoadingSpinner size="s" />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
              {error ? (
                <EuiFlexItem grow={false}>
                  <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="warning" color="danger" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s" color="danger">
                          {i18n.translate(
                            'xpack.observabilityAiAssistant.conversationList.errorMessage',
                            {
                              defaultMessage: 'Failed to load',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ) : null}
              {entries?.length ? (
                <EuiFlexItem grow>
                  <EuiListGroup flush={false} gutterSize="none">
                    {entries?.map((entry) => (
                      <EuiListGroupItem
                        key={entry.id}
                        label={entry.id}
                        size="s"
                        isActive={entry.id === selected}
                        isDisabled={loading || deleting}
                        href={link('/knowledge-base/{kbEntryId}', {
                          path: { kbEntryId: entry.id },
                        })}
                        wrapText
                        extraAction={
                          entry.id
                            ? {
                                iconType: 'trash',
                                ['aria-label']: 'entry',
                                onClick: () => {
                                  handleDeleteEntry(entry.id);
                                },
                              }
                            : undefined
                        }
                      />
                    ))}
                  </EuiListGroup>
                </EuiFlexItem>
              ) : null}

              {!loading && !error && !entries?.length ? (
                <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.conversationList.noConversations',
                      {
                        defaultMessage: 'No conversations',
                      }
                    )}
                  </EuiText>
                </EuiPanel>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow className={newChatButtonWrapperClassName}>
                  <NewEntryButton onClick={onClickNewEntry} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
}

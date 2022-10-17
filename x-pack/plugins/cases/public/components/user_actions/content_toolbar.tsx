/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserActionCopyLink } from './copy_link';
import type { Actions } from './property_actions';
import { UserActionPropertyActions } from './property_actions';

export interface UserActionContentToolbarProps {
  commentMarkdown?: string;
  id: string;
  isLoading: boolean;
  withCopyLinkAction?: boolean;
  actions?: Actions;
  editLabel?: string;
  deleteLabel?: string;
  deleteIcon?: string;
  deleteConfirmTitle?: string;
  deleteButtonText?: string;
  quoteLabel?: string;
  extraActions?: EuiCommentProps['actions'];
  onEdit?: (id: string) => void;
  onQuote?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const UserActionContentToolbarComponent = ({
  commentMarkdown,
  id,
  actions,
  editLabel,
  deleteLabel,
  deleteConfirmTitle,
  deleteButtonText,
  deleteIcon,
  quoteLabel,
  isLoading,
  extraActions,
  withCopyLinkAction = true,
  onEdit,
  onQuote,
  onDelete,
}: UserActionContentToolbarProps) => (
  <EuiFlexGroup responsive={false} alignItems="center">
    {withCopyLinkAction ? (
      <EuiFlexItem grow={false}>
        <UserActionCopyLink id={id} />
      </EuiFlexItem>
    ) : null}
    <EuiFlexItem grow={false}>
      <UserActionPropertyActions
        id={id}
        actions={actions}
        editLabel={editLabel}
        quoteLabel={quoteLabel}
        deleteLabel={deleteLabel}
        deleteIcon={deleteIcon}
        deleteConfirmTitle={deleteConfirmTitle}
        deleteButtonText={deleteButtonText}
        isLoading={isLoading}
        onEdit={onEdit}
        onQuote={onQuote}
        onDelete={onDelete}
        commentMarkdown={commentMarkdown}
      />
    </EuiFlexItem>
    {extraActions != null ? <EuiFlexItem grow={false}>{extraActions}</EuiFlexItem> : null}
  </EuiFlexGroup>
);
UserActionContentToolbarComponent.displayName = 'UserActionContentToolbar';

export const UserActionContentToolbar = memo(UserActionContentToolbarComponent);

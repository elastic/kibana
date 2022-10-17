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
  actions?: Actions;
  editLabel?: string;
  deleteLabel?: string;
  deleteConfirmTitle?: string;
  quoteLabel?: string;
  isLoading: boolean;
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
  quoteLabel,
  isLoading,
  extraActions,
  onEdit,
  onQuote,
  onDelete,
}: UserActionContentToolbarProps) => (
  <EuiFlexGroup responsive={false} alignItems="center">
    <EuiFlexItem grow={false}>
      <UserActionCopyLink id={id} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <UserActionPropertyActions
        id={id}
        actions={actions}
        editLabel={editLabel}
        quoteLabel={quoteLabel}
        deleteLabel={deleteLabel}
        deleteConfirmTitle={deleteConfirmTitle}
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

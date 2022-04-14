/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserActionCopyLink } from './copy_link';
import { UserActionPropertyActions } from './property_actions';

export interface UserActionContentToolbarProps {
  commentMarkdown: string;
  id: string;
  editLabel: string;
  deleteLabel?: string;
  quoteLabel: string;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onQuote: (id: string) => void;
  onDelete?: (id: string) => void;
  userCanCrud: boolean;
}

const UserActionContentToolbarComponent = ({
  commentMarkdown,
  id,
  editLabel,
  deleteLabel,
  quoteLabel,
  isLoading,
  onEdit,
  onQuote,
  onDelete,
  userCanCrud,
}: UserActionContentToolbarProps) => (
  <EuiFlexGroup responsive={false} alignItems="center">
    <EuiFlexItem grow={false}>
      <UserActionCopyLink id={id} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <UserActionPropertyActions
        id={id}
        editLabel={editLabel}
        quoteLabel={quoteLabel}
        deleteLabel={deleteLabel}
        isLoading={isLoading}
        onEdit={onEdit}
        onQuote={onQuote}
        onDelete={onDelete}
        userCanCrud={userCanCrud}
        commentMarkdown={commentMarkdown}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
UserActionContentToolbarComponent.displayName = 'UserActionContentToolbar';

export const UserActionContentToolbar = memo(UserActionContentToolbarComponent);

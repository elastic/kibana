/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserActionCopyLink } from './user_action_copy_link';
import { UserActionPropertyActions } from './user_action_property_actions';

export interface UserActionContentToolbarProps {
  commentMarkdown: string;
  id: string;
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
  editLabel: string;
  quoteLabel: string;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onQuote: (id: string) => void;
  userCanCrud: boolean;
}

const UserActionContentToolbarComponent = ({
  commentMarkdown,
  id,
  getCaseDetailHrefWithCommentId,
  editLabel,
  quoteLabel,
  isLoading,
  onEdit,
  onQuote,
  userCanCrud,
}: UserActionContentToolbarProps) => (
  <EuiFlexGroup responsive={false} alignItems="center">
    <EuiFlexItem grow={false}>
      <UserActionCopyLink id={id} getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <UserActionPropertyActions
        id={id}
        editLabel={editLabel}
        quoteLabel={quoteLabel}
        isLoading={isLoading}
        onEdit={onEdit}
        onQuote={onQuote}
        userCanCrud={userCanCrud}
        commentMarkdown={commentMarkdown}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const UserActionContentToolbar = memo(UserActionContentToolbarComponent);

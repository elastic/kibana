/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserActionCopyLink } from './user_action_copy_link';
import { UserActionPropertyActions } from './user_action_property_actions';

interface UserActionContentToolbarProps {
  id: string;
  editLabel: string;
  quoteLabel: string;
  disabled: boolean;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onQuote: (id: string) => void;
}

const UserActionContentToolbarComponent = ({
  id,
  editLabel,
  quoteLabel,
  disabled,
  isLoading,
  onEdit,
  onQuote,
}: UserActionContentToolbarProps) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UserActionCopyLink id={id} />
      </EuiFlexItem>
      <EuiFlexItem>
        <UserActionPropertyActions
          id={id}
          editLabel={editLabel}
          quoteLabel={quoteLabel}
          disabled={disabled}
          isLoading={isLoading}
          onEdit={onEdit}
          onQuote={onQuote}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const UserActionContentToolbar = memo(UserActionContentToolbarComponent);

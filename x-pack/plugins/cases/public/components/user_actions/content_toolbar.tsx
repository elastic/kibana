/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserActionCopyLink } from './copy_link';

export interface UserActionContentToolbarProps {
  id: string;
  children: React.ReactNode;
  withCopyLinkAction?: boolean;
}

const UserActionContentToolbarComponent: React.FC<UserActionContentToolbarProps> = ({
  id,
  withCopyLinkAction = true,
  children,
}) => (
  <EuiFlexGroup responsive={false} alignItems="center">
    {withCopyLinkAction ? (
      <EuiFlexItem grow={false}>
        <UserActionCopyLink id={id} />
      </EuiFlexItem>
    ) : null}
    {children}
  </EuiFlexGroup>
);

UserActionContentToolbarComponent.displayName = 'UserActionContentToolbar';

export const UserActionContentToolbar = memo(UserActionContentToolbarComponent);

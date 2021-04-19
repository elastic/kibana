/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserIcon } from '../../../components/shared/user_icon';
import { User } from '../../../types';

interface UserOptionItemProps {
  user: User;
}

export const UserOptionItem: React.FC<UserOptionItemProps> = ({ user }) => (
  <EuiFlexGroup gutterSize="xs" justifyContent="flexStart" alignItems="center">
    <EuiFlexItem grow={false}>
      <UserIcon {...user} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{user.name || user.email}</EuiFlexItem>
  </EuiFlexGroup>
);

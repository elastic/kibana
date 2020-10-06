/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserIcon } from '../../../components/shared/user_icon';
import { IUser } from '../../../types';

interface IUserOptionItemProps {
  user: IUser;
}

export const UserOptionItem: React.FC<IUserOptionItemProps> = ({ user }) => (
  <EuiFlexGroup gutterSize="xs" justifyContent="flexStart" alignItems="center">
    <EuiFlexItem grow={false}>
      <UserIcon {...user} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{user.name || user.email}</EuiFlexItem>
  </EuiFlexGroup>
);

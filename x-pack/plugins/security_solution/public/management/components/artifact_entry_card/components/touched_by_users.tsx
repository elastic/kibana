/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CREATED_BY, LAST_UPDATED_BY } from './translations';

export interface TouchedByUsersProps {
  createdBy: string;
  updatedBy: string;
}

export const TouchedByUsers = memo<TouchedByUsersProps>(({ createdBy, updatedBy }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="l">
      <EuiFlexItem grow={false}>
        <UserName label={CREATED_BY} value={createdBy} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <UserName label={LAST_UPDATED_BY} value={createdBy} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
TouchedByUsers.displayName = 'TouchedByUsers';

interface UserNameProps {
  label: string;
  value: string;
}

const UserName = memo<UserNameProps>(({ label, value }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge>{label}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar name={value} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="eui-textTruncate">
            {value}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
UserName.displayName = 'UserName';

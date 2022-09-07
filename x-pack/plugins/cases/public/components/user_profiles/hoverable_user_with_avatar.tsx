/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { UserToolTip } from './user_tooltip';
import { getName } from './display_name';
import { SmallUserAvatar } from './small_user_avatar';
import { UserInfoWithAvatar } from './types';

const HoverableUserWithAvatarComponent: React.FC<{ userInfo?: UserInfoWithAvatar }> = ({
  userInfo,
}) => {
  return (
    <UserToolTip userInfo={userInfo}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <SmallUserAvatar userInfo={userInfo} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction={'column'} gutterSize="none">
            <EuiFlexItem>
              <EuiText size="s" className="eui-textBreakWord">
                {getName(userInfo?.user)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </UserToolTip>
  );
};
HoverableUserWithAvatarComponent.displayName = 'HoverableUserWithAvatar';

export const HoverableUserWithAvatar = React.memo(HoverableUserWithAvatarComponent);

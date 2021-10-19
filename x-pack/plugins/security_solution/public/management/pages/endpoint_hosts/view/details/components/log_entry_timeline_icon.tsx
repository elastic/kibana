/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';

export const LogEntryTimelineIcon = memo(
  ({
    avatarColor,
    avatarIconColor,
    avatarSize,
    iconType,
    isResponseEvent,
  }: {
    avatarColor: EuiAvatarProps['color'];
    avatarIconColor?: EuiAvatarProps['iconColor'];
    avatarSize: EuiAvatarProps['size'];
    iconType: EuiAvatarProps['iconType'];
    isResponseEvent: boolean;
  }) => {
    return (
      <EuiAvatar
        name="Timeline Icon"
        size={avatarSize ?? 's'}
        color={avatarColor}
        iconColor={avatarIconColor ?? 'default'}
        iconType={iconType ?? 'dot'}
      />
    );
  }
);

LogEntryTimelineIcon.displayName = 'LogEntryTimelineIcon';

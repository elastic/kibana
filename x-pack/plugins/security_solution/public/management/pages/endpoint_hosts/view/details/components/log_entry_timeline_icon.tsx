/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';
import { useEuiTheme } from '../../../../../../common/lib/theme/use_eui_theme';

export const LogEntryTimelineIcon = memo(
  ({
    avatarSize,
    isResponseEvent,
    isSuccessful,
    iconType,
  }: {
    avatarSize: EuiAvatarProps['size'];
    isResponseEvent: boolean;
    isSuccessful: boolean;
    iconType: EuiAvatarProps['iconType'];
  }) => {
    const euiTheme = useEuiTheme();

    return (
      <EuiAvatar
        name="Timeline Icon"
        size={avatarSize ?? 's'}
        color={
          isResponseEvent && !isSuccessful
            ? euiTheme.euiColorVis9_behindText
            : euiTheme.euiColorLightestShade
        }
        iconColor="default"
        iconType={iconType ?? 'dot'}
      />
    );
  }
);

LogEntryTimelineIcon.displayName = 'LogEntryTimelineIcon';

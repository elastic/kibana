/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, isValidHex } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

import { getSpaceColor, getSpaceImageUrl, getSpaceInitials } from './space_attributes';
import type { SpaceAvatarProps } from './types';
import { MAX_SPACE_INITIALS } from '../../common';

export const SpaceAvatarInternal: FC<SpaceAvatarProps> = (props: SpaceAvatarProps) => {
  const { space, size, announceSpaceName, ...rest } = props;

  const spaceName = space.name ? space.name.trim() : '';

  const spaceColor = getSpaceColor(space);

  const spaceInitials = getSpaceInitials(space);

  const spaceImageUrl = getSpaceImageUrl(space);

  const avatarConfig: Partial<EuiAvatarProps> = spaceImageUrl
    ? { imageUrl: spaceImageUrl }
    : { initials: spaceInitials, initialsLength: MAX_SPACE_INITIALS };

  return (
    <EuiAvatar
      type="space"
      data-test-subj={`space-avatar-${space.id}`}
      name={spaceName}
      {...(!announceSpaceName && {
        // provide empty aria-label so EUI doesn't try to provide its own
        'aria-label': '',
        'aria-hidden': true,
      })}
      size={size || 'm'}
      color={isValidHex(spaceColor) ? spaceColor : ''}
      {...avatarConfig}
      {...rest}
    />
  );
};

SpaceAvatarInternal.defaultProps = {
  announceSpaceName: true,
};

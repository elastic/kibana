/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { UserAvatarProps } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

interface CaseUnknownUserAvatarProps {
  size: UserAvatarProps['size'];
}

const CaseUnknownUserAvatarComponent: React.FC<CaseUnknownUserAvatarProps> = ({ size }) => {
  return <UserAvatar data-test-subj="case-user-profile-avatar-unknown-user" size={size} />;
};
CaseUnknownUserAvatarComponent.displayName = 'UnknownUserAvatar';

export const CaseUnknownUserAvatar = React.memo(CaseUnknownUserAvatarComponent);

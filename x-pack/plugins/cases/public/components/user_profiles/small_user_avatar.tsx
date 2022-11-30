/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CaseUserAvatarProps } from './user_avatar';
import { CaseUserAvatar } from './user_avatar';

const SmallUserAvatarComponent: React.FC<Pick<CaseUserAvatarProps, 'userInfo'>> = ({
  userInfo,
}) => <CaseUserAvatar size={'s'} userInfo={userInfo} />;
SmallUserAvatarComponent.displayName = 'SmallUserAvatar';

export const SmallUserAvatar = React.memo(SmallUserAvatarComponent);

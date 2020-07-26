/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiAvatar } from '@elastic/eui';

interface UserActionAvatarProps {
  name: string;
}

const UserActionAvatarComponent = ({ name }: UserActionAvatarProps) => {
  return <EuiAvatar data-test-subj={`user-action-avatar`} size="l" name={name} />;
};

export const UserActionAvatar = memo(UserActionAvatarComponent);

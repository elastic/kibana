/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserAvatar } from '@kbn/user-profile-components';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { AssistantAvatar } from '../assistant_avatar';
import { MessageRole } from '../../../common/types';

interface ChatAvatarProps {
  role: MessageRole;
  user?: AuthenticatedUser | undefined;
}

export function ChatAvatar({ user, role }: ChatAvatarProps) {
  switch (role) {
    case MessageRole.User:
      return user ? (
        <UserAvatar user={user} size="m" data-test-subj="userMenuAvatar" />
      ) : (
        <EuiLoadingSpinner size="xl" />
      );

    case MessageRole.Assistant:
    case MessageRole.Elastic:
    case MessageRole.Function:
      return <EuiAvatar name="Elastic Assistant" iconType={AssistantAvatar} color="#fff" />;

    default:
      return null;
  }
}

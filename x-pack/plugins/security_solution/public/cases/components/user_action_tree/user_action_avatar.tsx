/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';

interface UserActionAvatarProps {
  username?: string | null;
  fullName?: string | null;
}

const UserActionAvatarComponent = ({ username, fullName }: UserActionAvatarProps) => {
  return (
    <>
      {(fullName && fullName.length > 0) || (username && username.length > 0) ? (
        <EuiAvatar
          name={fullName && fullName.length > 0 ? fullName : username ?? ''}
          data-test-subj={`user-action-avatar`}
        />
      ) : (
        <EuiLoadingSpinner data-test-subj={`user-action-avatar-loading-spinner`} />
      )}
    </>
  );
};

export const UserActionAvatar = memo(UserActionAvatarComponent);

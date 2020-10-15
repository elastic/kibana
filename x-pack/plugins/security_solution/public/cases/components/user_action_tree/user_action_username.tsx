/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';

interface UserActionUsernameProps {
  username: string;
  fullName?: string;
}

const UserActionUsernameComponent = ({ username, fullName }: UserActionUsernameProps) => {
  return (
    <EuiToolTip
      position="top"
      content={<p>{isEmpty(fullName) ? username : fullName}</p>}
      data-test-subj="user-action-username-tooltip"
    >
      <strong>{username}</strong>
    </EuiToolTip>
  );
};

export const UserActionUsername = memo(UserActionUsernameComponent);

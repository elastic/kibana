/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';

import * as i18n from './translations';

interface UserActionUsernameProps {
  username?: string | null;
  fullName?: string | null;
}

const UserActionUsernameComponent = ({ username, fullName }: UserActionUsernameProps) => {
  const tooltipContent = (isEmpty(fullName) ? username : fullName) ?? i18n.UNKNOWN;
  return (
    <EuiToolTip
      position="top"
      content={<p>{tooltipContent}</p>}
      data-test-subj="user-action-username-tooltip"
    >
      <strong>{username ?? i18n.UNKNOWN.toLowerCase()}</strong>
    </EuiToolTip>
  );
};

export const UserActionUsername = memo(UserActionUsernameComponent);

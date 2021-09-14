/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';

import { USERNAME_LABEL, EMAIL_LABEL } from '../constants';

import { ROLE_LABEL } from './constants';

interface Props {
  username: string;
  email: string;
  roleType: string;
}

const noItemsPlaceholder = <EuiTextColor color="subdued">&mdash;</EuiTextColor>;

export const UserAddedInfo: React.FC<Props> = ({ username, email, roleType }) => (
  <>
    <EuiText size="s">
      <strong>{USERNAME_LABEL}</strong>
    </EuiText>
    <EuiText size="s">{username}</EuiText>
    <EuiSpacer />
    <EuiText size="s">
      <strong>{EMAIL_LABEL}</strong>
    </EuiText>
    <EuiText size="s">{email || noItemsPlaceholder}</EuiText>
    <EuiSpacer />
    <EuiText size="s">
      <strong>{ROLE_LABEL}</strong>
    </EuiText>
    <EuiText size="s">{roleType}</EuiText>
    <EuiSpacer />
  </>
);

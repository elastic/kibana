/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';

import { USERNAME_LABEL, EMAIL_LABEL } from '../constants';

import {
  KIBANA_ACCESS_WARNING_TITLE,
  KIBANA_ACCESS_WARNING_DESCRIPTION,
  KIBANA_ACCESS_WARNING_ERROR_MESSAGE,
  ROLE_LABEL,
} from './constants';

interface Props {
  username: string;
  email: string;
  roleType: string;
  showKibanaAccessWarning: boolean;
}

const kibanaAccessWarning = (
  <>
    <EuiCallOut title={KIBANA_ACCESS_WARNING_TITLE} color="warning" iconType="help">
      <EuiText size="s">{KIBANA_ACCESS_WARNING_ERROR_MESSAGE}</EuiText>
      <EuiSpacer />
      <EuiText size="s">{KIBANA_ACCESS_WARNING_DESCRIPTION}</EuiText>
    </EuiCallOut>
    <EuiSpacer />
  </>
);

const noItemsPlaceholder = <EuiTextColor color="subdued">&mdash;</EuiTextColor>;

export const UserAddedInfo: React.FC<Props> = ({
  username,
  email,
  roleType,
  showKibanaAccessWarning,
}) => (
  <>
    {showKibanaAccessWarning && kibanaAccessWarning}
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

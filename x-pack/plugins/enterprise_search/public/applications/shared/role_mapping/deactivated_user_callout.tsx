/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiText, EuiIcon } from '@elastic/eui';

interface Props {
  isNew: boolean;
}

import { DEACTIVATED_USER_CALLOUT_LABEL, DEACTIVATED_USER_CALLOUT_DESCRIPTION } from './constants';

export const DeactivatedUserCallout: React.FC<Props> = ({ isNew }) => (
  <>
    {!isNew && <EuiSpacer />}
    <EuiText size="s">
      <EuiIcon type="warning" color="warning" /> <strong>{DEACTIVATED_USER_CALLOUT_LABEL}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="s">{DEACTIVATED_USER_CALLOUT_DESCRIPTION}</EuiText>
    <EuiSpacer />
  </>
);

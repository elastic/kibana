/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import React from 'react';
import type { SeverityUserAction } from '../../../common/api/cases/user_actions/severity';
import { SET_SEVERITY_TO } from '../create/translations';
import { createCommonUpdateUserActionBuilder } from './common';
import type { UserActionBuilder, UserActionResponse } from './types';
import { severities } from '../severity/config';

const getLabelTitle = (userAction: UserActionResponse<SeverityUserAction>) => {
  const severity = userAction.payload.severity;
  const severityData = severities[severity];
  if (severityData === undefined) {
    return null;
  }
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      data-test-subj={`${userAction.id}-user-action-severity-title`}
      responsive={false}
    >
      <EuiFlexItem grow={false}>{SET_SEVERITY_TO}</EuiFlexItem>
      <EuiFlexItem data-test-subj={`${userAction.id}-user-action-severity-title-${severity}`}>
        <EuiHealth color={severityData.color}>{severityData.label}</EuiHealth>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createSeverityUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const severityUserAction = userAction as UserActionResponse<SeverityUserAction>;
    const label = getLabelTitle(severityUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});

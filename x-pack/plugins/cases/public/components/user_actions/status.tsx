/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import type { SnakeToCamelCase } from '../../../common/types';
import type { StatusUserAction, CaseStatuses } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { statuses } from '../status';
import * as i18n from './translations';

const isStatusValid = (status: string): status is CaseStatuses => Object.hasOwn(statuses, status);

const getLabelTitle = (userAction: SnakeToCamelCase<StatusUserAction>) => {
  const status = userAction.payload.status ?? '';
  if (isStatusValid(status)) {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj={`${userAction.id}-user-action-status-title`}
        responsive={false}
      >
        <EuiFlexItem grow={false}>{i18n.MARKED_CASE_AS}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Status status={status} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <></>;
};

export const createStatusUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const statusUserAction = userAction as SnakeToCamelCase<StatusUserAction>;
    const label = getLabelTitle(statusUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'folderClosed',
    });

    return commonBuilder.build();
  },
});

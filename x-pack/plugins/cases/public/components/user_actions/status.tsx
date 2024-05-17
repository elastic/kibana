/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import React from 'react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { CaseStatuses, StatusUserAction } from '../../../common/types/domain';
import { statuses } from '../status';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';
import type { UserActionBuilder } from './types';

const isStatusValid = (status: string): status is CaseStatuses =>
  Object.prototype.hasOwnProperty.call(statuses, status);

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

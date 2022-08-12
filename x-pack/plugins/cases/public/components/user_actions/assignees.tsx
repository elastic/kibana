/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import React, { memo } from 'react';
import { Actions, AssigneesUserAction } from '../../../common/api';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { createCommonUpdateUserActionBuilder } from './common';
import type { UserActionBuilder, UserActionResponse } from './types';

interface AssigneesProps {
  assignees: Array<{
    uid: string;
    profile?: UserProfileWithAvatar;
  }>;
}

const AssigneesComponent = ({ assignees }: AssigneesProps) => (
  <>
    {assignees.length > 0 && (
      <EuiFlexGroup>
        {assignees.map((assignee) => {
          return assignee.profile != null ? (
            <EuiFlexItem>
              <UserToolTip profile={assignee.profile}>
                <strong>
                  {assignee.profile.user.display_name ??
                    assignee.profile.user.full_name ??
                    assignee.profile.user.username}
                </strong>
              </UserToolTip>
            </EuiFlexItem>
          ) : (
            'Unknown user'
          );
        })}
      </EuiFlexGroup>
    )}
  </>
);
AssigneesComponent.displayName = 'Assignees';
const Assignees = memo(AssigneesComponent);

const getLabelTitle = (
  userAction: UserActionResponse<AssigneesUserAction>,
  userProfiles?: Map<string, UserProfileWithAvatar>
) => {
  const assignees = userAction.payload.assignees.map((assignee) => {
    const profile = userProfiles?.get(assignee.uid);
    return {
      uid: assignee.uid,
      profile,
    };
  });

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span" responsive={false}>
      <EuiFlexItem data-test-subj="ua-assignees-label" grow={false}>
        {userAction.action === Actions.add && 'assigned'}
        {userAction.action === Actions.delete && 'unassigned'}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Assignees assignees={assignees} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createAssigneesUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
  userProfiles,
}) => ({
  build: () => {
    const assigneesUserAction = userAction as UserActionResponse<AssigneesUserAction>;
    const label = getLabelTitle(assigneesUserAction, userProfiles);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'tag',
    });

    return commonBuilder.build();
  },
});

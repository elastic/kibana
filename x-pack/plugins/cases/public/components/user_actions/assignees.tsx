/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import React, { memo } from 'react';
import { Actions, AssigneesUserAction } from '../../../common/api';
import { getName } from '../user_profiles/display_name';
import { Assignee } from '../user_profiles/types';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { createCommonUpdateUserActionBuilder } from './common';
import type { UserActionBuilder, UserActionResponse } from './types';
import * as i18n from './translations';
import { getUsernameDataTestSubj } from '../user_profiles/data_test_subject';

interface AssigneesProps {
  assignees: Assignee[];
  currentUserProfile?: UserProfileWithAvatar;
}

const AssigneesComponent = ({ assignees, currentUserProfile }: AssigneesProps) => (
  <>
    {assignees.length > 0 && (
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        {assignees.map((assignee, index) => {
          const usernameDataTestSubj = getUsernameDataTestSubj(assignee);

          return (
            <EuiFlexItem
              data-test-subj={`ua-assignee-${usernameDataTestSubj}`}
              grow={false}
              key={assignee.uid}
            >
              <UserToolTip profile={assignee.profile}>
                <EuiText size="s" className="eui-textBreakWord">
                  {shouldAddAnd(index, assignees.length) && <>{i18n.AND_SPACE}</>}
                  {isCurrentUser(assignee, currentUserProfile) ? (
                    <>{i18n.THEMSELVES}</>
                  ) : (
                    <strong>{getName(assignee.profile?.user)}</strong>
                  )}
                  {shouldAddComma(index, assignees.length) && <>{','}</>}
                </EuiText>
              </UserToolTip>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    )}
  </>
);
AssigneesComponent.displayName = 'Assignees';
const Assignees = memo(AssigneesComponent);

const isCurrentUser = (assignee: Assignee, currentUserProfile?: UserProfileWithAvatar) => {
  return assignee.uid === currentUserProfile?.uid;
};

const shouldAddComma = (index: number, length: number) => {
  return length > 0 && index !== length - 1;
};

const shouldAddAnd = (index: number, length: number) => {
  return length > 1 && index === length - 1;
};

const getLabelTitle = (
  userAction: UserActionResponse<AssigneesUserAction>,
  userProfiles?: Map<string, UserProfileWithAvatar>,
  currentUserProfile?: UserProfileWithAvatar
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
        {userAction.action === Actions.add && i18n.ASSIGNED}
        {userAction.action === Actions.delete && i18n.UNASSIGNED}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Assignees assignees={assignees} currentUserProfile={currentUserProfile} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createAssigneesUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
  userProfiles,
  currentUserProfile,
}) => ({
  build: () => {
    const assigneesUserAction = userAction as UserActionResponse<AssigneesUserAction>;
    const label = getLabelTitle(assigneesUserAction, userProfiles, currentUserProfile);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'userAvatar',
    });

    return commonBuilder.build();
  },
});

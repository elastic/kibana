/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import React, { memo } from 'react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { AssigneesUserAction, User } from '../../../common/api';
import { Actions } from '../../../common/api';
import { getName } from '../user_profiles/display_name';
import type { Assignee } from '../user_profiles/types';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { createCommonUpdateUserActionBuilder } from './common';
import type { UserActionBuilder, UserActionResponse } from './types';
import * as i18n from './translations';
import { getUsernameDataTestSubj } from '../user_profiles/data_test_subject';

const FormatListItem: React.FC<{
  children: React.ReactElement;
  index: number;
  listSize: number;
}> = ({ children, index, listSize }) => {
  if (shouldAddAnd(index, listSize)) {
    return (
      <>
        {i18n.AND} {children}
      </>
    );
  } else if (shouldAddComma(index, listSize)) {
    return (
      <>
        {children}
        {','}
      </>
    );
  }

  return children;
};
FormatListItem.displayName = 'FormatListItem';

export const shouldAddComma = (index: number, arrayLength: number) => {
  return arrayLength > 2 && index !== arrayLength - 1;
};

export const shouldAddAnd = (index: number, arrayLength: number) => {
  return arrayLength > 1 && index === arrayLength - 1;
};

const Themselves: React.FC<{
  index: number;
  numOfAssigness: number;
}> = ({ index, numOfAssigness }) => (
  <FormatListItem index={index} listSize={numOfAssigness}>
    <>{i18n.THEMSELVES}</>
  </FormatListItem>
);
Themselves.displayName = 'Themselves';

const AssigneeComponent: React.FC<{
  assignee: Assignee;
  index: number;
  numOfAssigness: number;
}> = ({ assignee, index, numOfAssigness }) => (
  <FormatListItem index={index} listSize={numOfAssigness}>
    <UserToolTip userInfo={assignee.profile}>
      <strong>{getName(assignee.profile?.user)}</strong>
    </UserToolTip>
  </FormatListItem>
);
AssigneeComponent.displayName = 'Assignee';

interface AssigneesProps {
  assignees: Assignee[];
  createdByUser: SnakeToCamelCase<User>;
}

const AssigneesComponent = ({ assignees, createdByUser }: AssigneesProps) => (
  <>
    {assignees.length > 0 && (
      <EuiFlexGroup alignItems="center" gutterSize="xs" wrap>
        {assignees.map((assignee, index) => {
          const usernameDataTestSubj = getUsernameDataTestSubj(assignee);

          return (
            <EuiFlexItem
              data-test-subj={`ua-assignee-${usernameDataTestSubj}`}
              grow={false}
              key={assignee.uid}
            >
              <EuiText size="s" className="eui-textBreakWord">
                {doesAssigneeMatchCreatedByUser(assignee, createdByUser) ? (
                  <Themselves index={index} numOfAssigness={assignees.length} />
                ) : (
                  <AssigneeComponent
                    assignee={assignee}
                    index={index}
                    numOfAssigness={assignees.length}
                  />
                )}
              </EuiText>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    )}
  </>
);
AssigneesComponent.displayName = 'Assignees';
const Assignees = memo(AssigneesComponent);

const doesAssigneeMatchCreatedByUser = (
  assignee: Assignee,
  createdByUser: SnakeToCamelCase<User>
) => {
  return (
    assignee.uid === createdByUser?.profileUid ||
    // cases created before the assignees functionality will not have the profileUid so we'll need to fallback to the
    // next best field
    assignee?.profile?.user.username === createdByUser.username
  );
};

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
        {userAction.action === Actions.add && i18n.ASSIGNED}
        {userAction.action === Actions.delete && i18n.UNASSIGNED}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Assignees createdByUser={userAction.createdBy} assignees={assignees} />
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
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'userAvatar',
    });

    return commonBuilder.build();
  },
});

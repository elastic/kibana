/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CaseUserAvatar } from './user_avatar';
import { UserToolTip } from './user_tooltip';
import { getName } from './display_name';
import * as i18n from './translations';
import { Assignee } from './types';
import { useCasesContext } from '../cases_context/use_cases_context';

const UserAvatarWithName: React.FC<{ profile?: UserProfileWithAvatar }> = ({ profile }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <CaseUserAvatar size={'s'} profile={profile} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction={'column'} gutterSize="none">
          <EuiFlexItem>
            <EuiText size="s" className="eui-textBreakWord">
              {getName(profile?.user)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
UserAvatarWithName.displayName = 'UserAvatarWithName';

export interface UserRepresentationProps {
  assignee: Assignee;
  onRemoveAssignee: (removedAssigneeUID: string) => void;
}

const UserRepresentationComponent: React.FC<UserRepresentationProps> = ({
  assignee,
  onRemoveAssignee,
}) => {
  const { permissions } = useCasesContext();
  const [isHovering, setIsHovering] = useState(false);

  const removeAssigneeCallback = useCallback(
    () => onRemoveAssignee(assignee.uid),
    [onRemoveAssignee, assignee.uid]
  );

  const onFocus = useCallback(() => setIsHovering(true), []);
  const onFocusLeave = useCallback(() => setIsHovering(false), []);

  const usernameDataTestSubj = assignee.profile?.user.username ?? assignee.uid;

  return (
    <EuiFlexGroup
      onMouseEnter={onFocus}
      onMouseLeave={onFocusLeave}
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
      data-test-subj={`user-profile-assigned-user-group-${usernameDataTestSubj}`}
    >
      <EuiFlexItem grow={false}>
        <UserToolTip profile={assignee.profile}>
          <UserAvatarWithName profile={assignee.profile} />
        </UserToolTip>
      </EuiFlexItem>
      {permissions.update && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="left"
            content={i18n.REMOVE_ASSIGNEE}
            data-test-subj={`user-profile-assigned-user-cross-tooltip-${usernameDataTestSubj}`}
          >
            <EuiButtonIcon
              css={{
                opacity: isHovering ? 1 : 0,
              }}
              onFocus={onFocus}
              onBlur={onFocusLeave}
              data-test-subj={`user-profile-assigned-user-cross-${usernameDataTestSubj}`}
              aria-label={i18n.REMOVE_ASSIGNEE_ARIA_LABEL}
              iconType="cross"
              color="danger"
              iconSize="m"
              onClick={removeAssigneeCallback}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

UserRepresentationComponent.displayName = 'UserRepresentation';

export const UserRepresentation = React.memo(UserRepresentationComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { intersectionWith } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import { UserProfile } from '@kbn/security-plugin/common';

import { CaseAssignees } from '../../../../common/api/cases/assignee';
import * as i18n from '../translations';
import { SuggestUsers } from '../../user_profiles/suggest_users';
import { SidebarTitle } from './sidebar_title';
import { UserRepresentation } from '../../user_profiles/user_representation';

interface AssignUsersProps {
  assignees: CaseAssignees;
  userProfiles: UserProfile[];
  onAssigneesChanged: (assignees: CaseAssignees) => void;
  isLoading: boolean;
}

const AssignUsersComponent: React.FC<AssignUsersProps> = ({
  assignees,
  userProfiles,
  onAssigneesChanged,
  isLoading,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<CaseAssignees>(assignees);

  const selectedUsers = useMemo(
    () =>
      intersectionWith(
        userProfiles,
        assignees,
        (userProfile, assignee) => userProfile.uid === assignee.uid
      ),
    [assignees, userProfiles]
  );

  const togglePopOver = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, []);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);

    onAssigneesChanged(selectedAssignees.map((assignee) => ({ uid: assignee.uid })));
  }, [onAssigneesChanged, selectedAssignees]);

  const button = (
    <EuiButtonIcon
      data-test-subj="assignees-edit-button"
      aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
      iconType={'pencil'}
      onClick={togglePopOver}
      disabled={isLoading}
    />
  );

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <SidebarTitle title={i18n.ASSIGNEES} />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="assignees-edit" grow={false}>
          <EuiPopover
            button={button}
            isOpen={isPopoverOpen}
            closePopover={onClosePopover}
            anchorPosition="downRight"
            panelStyle={{
              minWidth: 520,
            }}
          >
            <SuggestUsers onUsersChange={setSelectedAssignees} selectedUsers={selectedUsers} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      {assignees.length === 0 ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{i18n.NO_ASSIGNEES}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink>{'Assign a user'}</EuiLink>
              <span>{' or '}</span>
              <EuiLink>{'assign yourself'}</EuiLink>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {assignees.map((assignee) => {
            /**
             * TODO: Return a Map from useBulkGetUserProfiles to avoid searching
             * in the userProfiles array.
             */
            const userProfile = userProfiles.find((profile) => profile.uid === assignee.uid);

            if (!userProfile) {
              return null;
            }

            return (
              <EuiFlexItem grow={false}>
                <UserRepresentation key={userProfile.uid} profile={userProfile} />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </>
  );
};

AssignUsersComponent.displayName = 'AssignUsers';

export const AssignUsers = React.memo(AssignUsersComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiLink,
  EuiPopover,
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CaseAssignees } from '../../../../common/api/cases/assignee';
import * as i18n from '../translations';
import { SuggestUsers } from '../../user_profiles/suggest_users';
import { SidebarTitle } from './sidebar_title';
import { UserRepresentation } from '../../user_profiles/user_representation';
import { useCasesContext } from '../../cases_context/use_cases_context';

interface AssigneesListProps {
  assigneesWithProfiles: UserProfileWithAvatar[];
  currentUserProfile?: UserProfileWithAvatar;
  assignSelf: () => void;
  togglePopOver: () => void;
  onAssigneeRemoved: (removedAssigneeUID: string) => void;
}

const AssigneesList: React.FC<AssigneesListProps> = ({
  assigneesWithProfiles,
  currentUserProfile,
  assignSelf,
  togglePopOver,
  onAssigneeRemoved,
}) => {
  return (
    <>
      {assigneesWithProfiles.length === 0 ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{i18n.NO_ASSIGNEES}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink data-test-subj="case-view-assign-users-link" onClick={togglePopOver}>
                {i18n.ASSIGN_A_USER}
              </EuiLink>
              {currentUserProfile && (
                <>
                  <span>{i18n.SPACED_OR}</span>
                  <EuiLink data-test-subj="case-view-assign-yourself-link" onClick={assignSelf}>
                    {i18n.ASSIGN_YOURSELF}
                  </EuiLink>
                </>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {assigneesWithProfiles.map((profile) => (
            <EuiFlexItem key={profile.uid} grow={false}>
              <UserRepresentation profile={profile} onRemoveAssignee={onAssigneeRemoved} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
};
AssigneesList.displayName = 'AssigneesList';

export interface AssignUsersProps {
  assignees: CaseAssignees;
  currentUserProfile?: UserProfileWithAvatar;
  userProfiles: Map<string, UserProfileWithAvatar>;
  onAssigneesChanged: (assignees: UserProfileWithAvatar[]) => void;
  isLoading: boolean;
}

const AssignUsersComponent: React.FC<AssignUsersProps> = ({
  assignees,
  userProfiles,
  currentUserProfile,
  onAssigneesChanged,
  isLoading,
}) => {
  const assigneesWithProfiles = useMemo(() => {
    return assignees.reduce<UserProfileWithAvatar[]>((acc, assignee) => {
      const profile = userProfiles.get(assignee.uid);
      if (profile) {
        acc.push(profile);
      }

      return acc;
    }, []);
  }, [assignees, userProfiles]);

  const [selectedAssignees, setSelectedAssignees] = useState<UserProfileWithAvatar[]>([]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopOver = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, []);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onAssigneeRemoved = useCallback(
    (removedAssigneeUID: string) => {
      const remainingAssignees = assigneesWithProfiles.filter(
        (assignee) => assignee.uid !== removedAssigneeUID
      );
      setSelectedAssignees(remainingAssignees);
    },
    [assigneesWithProfiles]
  );

  const onUsersChange = useCallback((users: UserProfileWithAvatar[]) => {
    setSelectedAssignees(users);
  }, []);

  const assignSelf = useCallback(() => {
    if (!currentUserProfile) {
      return;
    }

    const newAssignees = [...assigneesWithProfiles, currentUserProfile];
    setSelectedAssignees(newAssignees);
  }, [currentUserProfile, assigneesWithProfiles]);

  const { permissions } = useCasesContext();

  useEffect(() => {
    if (isPopoverOpen === false) {
      onAssigneesChanged(selectedAssignees);
    }
  }, [isPopoverOpen, onAssigneesChanged, selectedAssignees]);

  const popOverButton = (
    <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
      <EuiButtonIcon
        data-test-subj="case-view-assignees-edit-button"
        aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
        iconType={'pencil'}
        onClick={togglePopOver}
        disabled={isLoading}
      />
    </EuiToolTip>
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
        {isLoading && <EuiLoadingSpinner data-test-subj="case-view-assignees-button-loading" />}
        {!isLoading && permissions.update && (
          <EuiFlexItem data-test-subj="case-view-assignees-edit" grow={false}>
            <EuiPopover
              button={popOverButton}
              isOpen={isPopoverOpen}
              closePopover={onClosePopover}
              anchorPosition="downRight"
              panelStyle={{
                minWidth: 520,
              }}
            >
              <SuggestUsers
                isLoading={isLoading}
                currentUserProfile={currentUserProfile}
                onUsersChange={onUsersChange}
                selectedUsers={assigneesWithProfiles}
              />
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isLoading && <EuiLoadingSpinner data-test-subj="case-view-assignees-list-loading" />}
      {!isLoading && (
        <AssigneesList
          assigneesWithProfiles={assigneesWithProfiles}
          currentUserProfile={currentUserProfile}
          assignSelf={assignSelf}
          togglePopOver={togglePopOver}
          onAssigneeRemoved={onAssigneeRemoved}
        />
      )}
    </>
  );
};

AssignUsersComponent.displayName = 'AssignUsers';

export const AssignUsers = React.memo(AssignUsersComponent);

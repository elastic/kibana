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

  const [selectedAssignees, setSelectedAssignees] =
    useState<UserProfileWithAvatar[]>(assigneesWithProfiles);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopOver = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, []);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);

    onAssigneesChanged(selectedAssignees);
  }, [onAssigneesChanged, selectedAssignees]);

  const onAssigneeRemoved = useCallback(
    (removedAssigneeUID: string) => {
      const remainingAssignees = selectedAssignees.filter(
        (assignee) => assignee.uid !== removedAssigneeUID
      );
      setSelectedAssignees(remainingAssignees);
      onAssigneesChanged(remainingAssignees);
    },
    [onAssigneesChanged, selectedAssignees]
  );

  const onUsersChange = useCallback((users: UserProfileWithAvatar[]) => {
    setSelectedAssignees(users);
  }, []);

  const assignSelf = useCallback(() => {
    if (!currentUserProfile) {
      return;
    }

    const newAssignees = [...selectedAssignees, currentUserProfile];
    setSelectedAssignees(newAssignees);
    onAssigneesChanged(newAssignees);
  }, [currentUserProfile, onAssigneesChanged, selectedAssignees]);

  const { permissions } = useCasesContext();

  useEffect(() => {
    setSelectedAssignees(assigneesWithProfiles);
  }, [assigneesWithProfiles]);

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
        {isLoading && <EuiLoadingSpinner data-test-subj="case-view-assignees-loading" />}
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
              <SuggestUsers onUsersChange={onUsersChange} selectedUsers={assigneesWithProfiles} />
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {selectedAssignees.length === 0 ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{i18n.NO_ASSIGNEES}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink onClick={togglePopOver}>{i18n.ASSIGN_A_USER}</EuiLink>
              {currentUserProfile && (
                <>
                  <span>{i18n.SPACED_OR}</span>
                  <EuiLink onClick={assignSelf}>{i18n.ASSIGN_YOURSELF}</EuiLink>
                </>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {selectedAssignees.map((profile) => (
            <EuiFlexItem key={profile.uid} grow={false}>
              <UserRepresentation profile={profile} onRemoveAssignee={onAssigneeRemoved} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
};

AssignUsersComponent.displayName = 'AssignUsers';

export const AssignUsers = React.memo(AssignUsersComponent);

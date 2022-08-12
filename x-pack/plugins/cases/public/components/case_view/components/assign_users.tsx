/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiLink,
  EuiPopover,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useAssignees } from '../../../containers/user_profiles/use_assignees';
import { CaseAssignees } from '../../../../common/api/cases/assignee';
import * as i18n from '../translations';
import { SuggestUsers } from '../../user_profiles/suggest_users';
import { SidebarTitle } from './sidebar_title';
import { UserRepresentation } from '../../user_profiles/user_representation';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { Assignee } from '../../user_profiles/types';

interface AssigneesListProps {
  assignees: Assignee[];
  currentUserProfile?: UserProfileWithAvatar;
  assignSelf: () => void;
  togglePopOver: () => void;
  onAssigneeRemoved: (removedAssigneeUID: string) => void;
}

const AssigneesList: React.FC<AssigneesListProps> = ({
  assignees,
  currentUserProfile,
  assignSelf,
  togglePopOver,
  onAssigneeRemoved,
}) => {
  return (
    <>
      {assignees.length === 0 ? (
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
          {assignees.map((assignee) => (
            <EuiFlexItem key={assignee.uid} grow={false}>
              <UserRepresentation assignee={assignee} onRemoveAssignee={onAssigneeRemoved} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
};
AssigneesList.displayName = 'AssigneesList';

export interface AssignUsersProps {
  caseAssignees: CaseAssignees;
  currentUserProfile?: UserProfileWithAvatar;
  userProfiles: Map<string, UserProfileWithAvatar>;
  onAssigneesChanged: (assignees: Assignee[]) => void;
  isLoading: boolean;
}

const AssignUsersComponent: React.FC<AssignUsersProps> = ({
  caseAssignees,
  userProfiles,
  currentUserProfile,
  onAssigneesChanged,
  isLoading,
}) => {
  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles,
  });
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[] | undefined>();
  const [needToUpdateAssignees, setNeedToUpdateAssignees] = useState(false);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopOver = useCallback(() => {
    setIsPopoverOpen((value) => !value);
    setNeedToUpdateAssignees(true);
  }, []);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
    setNeedToUpdateAssignees(true);
  }, []);

  const onAssigneeRemoved = useCallback(
    (removedAssigneeUID: string) => {
      const remainingAssignees = allAssignees.filter(
        (assignee) => assignee.uid !== removedAssigneeUID
      );
      setSelectedAssignees(remainingAssignees);
      setNeedToUpdateAssignees(true);
    },
    [allAssignees]
  );

  const onUsersChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      // TODO: ask Shani if this is what we want
      if (users.length > 0) {
        setSelectedAssignees([...users, ...assigneesWithoutProfiles]);
      } else {
        setSelectedAssignees([]);
      }
    },
    [assigneesWithoutProfiles]
  );

  const assignSelf = useCallback(() => {
    if (!currentUserProfile) {
      return;
    }

    const newAssignees = [currentUserProfile, ...allAssignees];
    setSelectedAssignees(newAssignees);
    setNeedToUpdateAssignees(true);
  }, [currentUserProfile, allAssignees]);

  const { permissions } = useCasesContext();

  useEffect(() => {
    // selectedAssignees will be undefined when an initial or rerender occurs, so we only want to update the assignees
    // after the users have been changed in some manner not when it is an initial value
    if (isPopoverOpen === false && needToUpdateAssignees && selectedAssignees) {
      setNeedToUpdateAssignees(false);
      onAssigneesChanged(selectedAssignees);
    }
  }, [isPopoverOpen, needToUpdateAssignees, onAssigneesChanged, selectedAssignees]);

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
    <EuiFlexItem grow={false}>
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
      <EuiSpacer size="m" />
      <AssigneesList
        assignees={allAssignees}
        currentUserProfile={currentUserProfile}
        assignSelf={assignSelf}
        togglePopOver={togglePopOver}
        onAssigneeRemoved={onAssigneeRemoved}
      />
    </EuiFlexItem>
  );
};

AssignUsersComponent.displayName = 'AssignUsers';

export const AssignUsers = React.memo(AssignUsersComponent);

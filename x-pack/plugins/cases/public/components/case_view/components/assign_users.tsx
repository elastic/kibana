/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiLink,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { UserProfile } from '@kbn/security-plugin/common';

import { CaseAssignees } from '../../../../common/api/cases/assignee';
import * as i18n from '../translations';
import { SuggestUsers } from '../../user_profiles/suggest_users';
import { SidebarTitle } from './sidebar_title';
import { UserRepresentation } from '../../user_profiles/user_representation';

interface AssignUsersProps {
  assignees: CaseAssignees;
  userProfiles: Map<string, UserProfile>;
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

  const assigneeProfiles = useMemo(() => {
    return assignees.reduce<UserProfile[]>((acc, assignee) => {
      const profile = userProfiles.get(assignee.uid);
      if (profile) {
        acc.push(profile);
      }

      return acc;
    }, []);
  }, [assignees, userProfiles]);

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
          <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
            <EuiPopover
              button={button}
              isOpen={isPopoverOpen}
              closePopover={onClosePopover}
              anchorPosition="downRight"
              panelStyle={{
                minWidth: 520,
              }}
            >
              <SuggestUsers onUsersChange={setSelectedAssignees} selectedUsers={assigneeProfiles} />
            </EuiPopover>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      {assigneeProfiles.length === 0 ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{i18n.NO_ASSIGNEES}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink>{i18n.ASSIGN_A_USER}</EuiLink>
              <span>{i18n.SPACED_OR}</span>
              <EuiLink>{i18n.ASSIGN_YOURSELF}</EuiLink>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {assigneeProfiles.map((profile) => {
            return (
              <EuiFlexItem grow={false}>
                <UserRepresentation key={profile.uid} profile={profile} />
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

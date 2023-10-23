/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesPopover } from '@kbn/user-profile-components';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useSuggestUsers } from '../../../../detections/containers/detection_engine/alerts/use_suggest_users';
import { ASSIGNEES_ADD_BUTTON_TEST_ID } from './test_ids';

const PopoverButton: FC<{ togglePopover: () => void; isDisabled: boolean }> = memo(
  ({ togglePopover, isDisabled }) => (
    <EuiToolTip
      position="left"
      content={i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.assignees.popoverTooltip',
        {
          defaultMessage: 'Assignees',
        }
      )}
    >
      <EuiButtonIcon
        aria-label="Update assignees"
        data-test-subj={ASSIGNEES_ADD_BUTTON_TEST_ID}
        iconType={'plusInCircle'}
        onClick={togglePopover}
        disabled={isDisabled}
      />
    </EuiToolTip>
  )
);
PopoverButton.displayName = 'PopoverButton';

export interface AssigneesPopoverProps {
  /**
   * Ids of the users assigned to the alert
   */
  existingAssigneesIds: string[];

  /**
   * Boolean to allow popover to be opened or closed
   */
  isPopoverOpen: boolean;

  /**
   * Callback to handle changing ot the assignees selection
   */
  onUsersChange: (users: string[]) => void;

  /**
   * Callback to handle clicking the add assignees button to indicate that user wants to open/close the popover
   */
  togglePopover: () => void;

  /**
   * Callback to handle hiding of the popover
   */
  onClosePopover: () => void;
}

/**
 * The popover to allow user assignees selection for the alert
 */
export const AssigneesPopover: FC<AssigneesPopoverProps> = memo(
  ({ existingAssigneesIds, isPopoverOpen, onUsersChange, togglePopover, onClosePopover }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { loading: isLoadingUsers, userProfiles } = useSuggestUsers(searchTerm);

    const [selectedAssignees, setSelectedAssignees] = useState<UserProfileWithAvatar[]>([]);
    useEffect(() => {
      if (isLoadingUsers) {
        return;
      }
      const assignees = userProfiles.filter((user) => existingAssigneesIds.includes(user.uid));
      setSelectedAssignees(assignees);
    }, [existingAssigneesIds, isLoadingUsers, userProfiles]);

    const handleSelectedAssignees = useCallback(
      (newAssignees: UserProfileWithAvatar[]) => {
        if (!isEqual(newAssignees, selectedAssignees)) {
          setSelectedAssignees(newAssignees);
          onUsersChange(newAssignees.map((user) => user.uid));
        }
      },
      [onUsersChange, selectedAssignees]
    );

    const selectedStatusMessage = useCallback(
      (total: number) =>
        i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.assignees.totalUsersAssigned',
          {
            defaultMessage: '{total, plural, one {# filter} other {# filters}} selected',
            values: { total },
          }
        ),
      []
    );

    return (
      <UserProfilesPopover
        title={i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.assignees.popoverTitle',
          {
            defaultMessage: 'Assignees',
          }
        )}
        button={<PopoverButton togglePopover={togglePopover} isDisabled={isLoadingUsers} />}
        isOpen={isPopoverOpen}
        closePopover={onClosePopover}
        panelStyle={{
          minWidth: 520,
        }}
        selectableProps={{
          onSearchChange: (term: string) => {
            setSearchTerm(term);
          },
          onChange: handleSelectedAssignees,
          selectedStatusMessage,
          options: userProfiles,
          selectedOptions: selectedAssignees,
          isLoading: isLoadingUsers,
          height: 'full',
        }}
      />
    );
  }
);

AssigneesPopover.displayName = 'AssigneesPopover';

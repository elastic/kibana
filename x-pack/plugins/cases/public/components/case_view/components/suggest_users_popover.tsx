/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfilesPopover, UserProfileWithAvatar } from '@kbn/user-profile-components';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { isEmpty, sortBy } from 'lodash';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { AssigneeWithProfile } from '../../user_profiles/types';
import * as i18n from '../translations';
import { getSortField } from '../../user_profiles/sort';

const SelectedStatusMessageComponent: React.FC<{
  selectedCount: number;
}> = ({ selectedCount }) => {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="none" data-test-subj="case-view-assignees-popover-totals">
      <EuiFlexItem grow={false}>{i18n.TOTAL_USERS_ASSIGNED(selectedCount)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
SelectedStatusMessageComponent.displayName = 'SelectedStatusMessage';

const PopoverButton: React.FC<{ togglePopover: () => void; isLoading: boolean }> = ({
  togglePopover,
  isLoading,
}) => (
  <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
    <EuiButtonIcon
      data-test-subj="case-view-assignees-edit-button"
      aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
      iconType={'pencil'}
      onClick={togglePopover}
      disabled={isLoading}
    />
  </EuiToolTip>
);
PopoverButton.displayName = 'PopoverButton';

export interface SuggestUsersPopoverProps {
  assignedUsersWithProfiles: AssigneeWithProfile[];
  isLoading: boolean;
  isPopoverOpen: boolean;
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
  togglePopover: () => void;
  onClosePopover: () => void;
}

const SuggestUsersPopoverComponent: React.FC<SuggestUsersPopoverProps> = ({
  assignedUsersWithProfiles,
  isLoading,
  isPopoverOpen,
  onUsersChange,
  togglePopover,
  onClosePopover,
}) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedProfiles = useMemo(() => {
    return sortProfiles(assignedUsersWithProfiles.map((assignee) => ({ ...assignee.profile })));
  }, [assignedUsersWithProfiles]);

  const [selectedUsers, setSelectedUsers] = useState<UserProfileWithAvatar[] | undefined>();

  const [searchResultProfiles, setSearchResultProfiles] = useState<
    UserProfileWithAvatar[] | undefined
  >();

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      // TODO: might need to sort these too? and put the current user at the front
      setSelectedUsers(users);
      onUsersChange(users);
    },
    [onUsersChange]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => <SelectedStatusMessageComponent selectedCount={selectedCount} />,
    []
  );

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
  });

  useEffect(() => {
    // TODO: if the current user is selected move it to the front
    const sortedUserProfiles = sortProfiles(userProfiles);

    if (!isEmpty(searchTerm)) {
      setSearchResultProfiles(sortedUserProfiles);
    } else {
      setSearchResultProfiles(undefined);
    }
  }, [searchTerm, userProfiles]);

  const isLoadingData = isLoadingSuggest || isLoading;

  return (
    <UserProfilesPopover
      title={i18n.EDIT_ASSIGNEES}
      button={<PopoverButton togglePopover={togglePopover} isLoading={isLoadingData} />}
      isOpen={isPopoverOpen}
      closePopover={onClosePopover}
      panelStyle={{
        minWidth: 520,
      }}
      selectableProps={{
        onChange,
        onSearchChange: setSearchTerm,
        selectedStatusMessage,
        options: searchResultProfiles,
        selectedOptions: selectedUsers ?? selectedProfiles,
        isLoading: isLoadingData,
        height: 'full',
        searchPlaceholder: i18n.SEARCH_USERS,
        clearButtonLabel: i18n.REMOVE_ASSIGNEES,
        emptyMessage: '',
      }}
    />
  );
};

SuggestUsersPopoverComponent.displayName = 'SuggestUsersPopover';

export const SuggestUsersPopover = React.memo(SuggestUsersPopoverComponent);

const sortProfiles = (profiles?: UserProfileWithAvatar[]) => {
  if (!profiles) {
    return [];
  }

  return sortBy(profiles, getSortField);
};

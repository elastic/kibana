/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfilesPopover, UserProfileWithAvatar } from '@kbn/user-profile-components';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty, sortBy } from 'lodash';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { AssigneeWithProfile } from '../../user_profiles/types';
import * as i18n from '../translations';
import { getSortField, moveCurrentUserToBeginning } from '../../user_profiles/sort';

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

const EmptyMessage: React.FC = () => null;
EmptyMessage.displayName = 'EmptyMessage';

const NoMatches: React.FC = () => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      direction="column"
      justifyContent="spaceAround"
      data-test-subj="case-view-assignees-popover-no-matches"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="userAvatar" size="xl" />
        <EuiSpacer size="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextAlign textAlign="center">
          <EuiText size="s" color="default">
            <strong>{i18n.NO_MATCHING_USERS}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {i18n.TRY_MODIFYING_SEARCH}
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
NoMatches.displayName = 'NoMatches';

export interface SuggestUsersPopoverProps {
  assignedUsersWithProfiles: AssigneeWithProfile[];
  currentUserProfile?: UserProfileWithAvatar;
  isLoading: boolean;
  isPopoverOpen: boolean;
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
  togglePopover: () => void;
  onClosePopover: () => void;
}

const SuggestUsersPopoverComponent: React.FC<SuggestUsersPopoverProps> = ({
  assignedUsersWithProfiles,
  currentUserProfile,
  isLoading,
  isPopoverOpen,
  onUsersChange,
  togglePopover,
  onClosePopover,
}) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedProfiles = useMemo(() => {
    return moveCurrentUserToBeginning(
      currentUserProfile,
      sortProfiles(assignedUsersWithProfiles.map((assignee) => ({ ...assignee.profile })))
    );
  }, [assignedUsersWithProfiles, currentUserProfile]);

  const [selectedUsers, setSelectedUsers] = useState<UserProfileWithAvatar[] | undefined>();

  const [searchResultProfiles, setSearchResultProfiles] = useState<
    UserProfileWithAvatar[] | undefined
  >();

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      const sortedUsers = moveCurrentUserToBeginning(currentUserProfile, sortProfiles(users));
      setSelectedUsers(sortedUsers);
      onUsersChange(sortedUsers ?? []);
    },
    [currentUserProfile, onUsersChange]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => <SelectedStatusMessageComponent selectedCount={selectedCount} />,
    []
  );

  const { data: userProfiles, isFetching: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
  });

  const isLoadingData = isLoadingSuggest || isLoading;

  useEffect(() => {
    const sortedUserProfiles = sortProfiles(userProfiles);
    if (!isEmpty(searchTerm)) {
      setSearchResultProfiles(sortedUserProfiles);
    } else {
      setSearchResultProfiles(undefined);
    }
  }, [searchTerm, userProfiles]);

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
        emptyMessage: <EmptyMessage />,
        noMatchesMessage: searchResultProfiles ? <NoMatches /> : <EmptyMessage />,
      }}
    />
  );
};

SuggestUsersPopoverComponent.displayName = 'SuggestUsersPopover';

export const SuggestUsersPopover = React.memo(SuggestUsersPopoverComponent);

const sortProfiles = (profiles?: UserProfileWithAvatar[] | null) => {
  if (!profiles) {
    return;
  }

  return sortBy(profiles, getSortField);
};

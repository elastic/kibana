/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import React, { useMemo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { SEARCH_BAR_TEST_ID, USER_SELECT_TEST_ID } from './test_ids';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';
import { userFilterUsers, userSearchedNotes } from '..';

export const USERS_DROPDOWN = i18n.translate('xpack.securitySolution.notes.usersDropdownLabel', {
  defaultMessage: 'Users',
});

export const SearchRow = React.memo(() => {
  const dispatch = useDispatch();
  const searchBox = useMemo(
    () => ({
      placeholder: 'Search note contents',
      incremental: false,
      'data-test-subj': SEARCH_BAR_TEST_ID,
    }),
    []
  );

  const onQueryChange = useCallback(
    ({ queryText }: { queryText: string }) => {
      dispatch(userSearchedNotes(queryText.trim()));
    },
    [dispatch]
  );

  const { isLoading: isLoadingSuggestedUsers, data: userProfiles } = useSuggestUsers({
    searchTerm: '',
  });
  const users = useMemo(
    () =>
      (userProfiles || []).map((userProfile: UserProfileWithAvatar) => ({
        label: userProfile.user.full_name || userProfile.user.username,
      })),
    [userProfiles]
  );

  const [selectedUser, setSelectedUser] = useState<Array<EuiComboBoxOptionOption<string>>>();
  const onChange = useCallback(
    (user: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedUser(user);
      dispatch(userFilterUsers(user.length > 0 ? user[0].label : ''));
    },
    [dispatch]
  );

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiSearchBar box={searchBox} onChange={onQueryChange} defaultQuery="" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiComboBox
          prepend={USERS_DROPDOWN}
          singleSelection={{ asPlainText: true }}
          options={users}
          selectedOptions={selectedUser}
          onChange={onChange}
          isLoading={isLoadingSuggestedUsers}
          data-test-subj={USER_SELECT_TEST_ID}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SearchRow.displayName = 'SearchRow';

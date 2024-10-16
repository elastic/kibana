/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { ASSOCIATED_NOT_SELECT_TEST_ID, SEARCH_BAR_TEST_ID, USER_SELECT_TEST_ID } from './test_ids';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';
import { userFilterAssociatedNotes, userFilterUsers, userSearchedNotes } from '..';
import { AssociatedFilter } from '../../../common/notes/constants';

export const USERS_DROPDOWN = i18n.translate('xpack.securitySolution.notes.usersDropdownLabel', {
  defaultMessage: 'Users',
});
const FILTER_SELECT = i18n.translate('xpack.securitySolution.notes.management.filterSelect', {
  defaultMessage: 'Select filter',
});

const searchBox = {
  placeholder: 'Search note contents',
  incremental: false,
  'data-test-subj': SEARCH_BAR_TEST_ID,
};
const associatedNoteSelectOptions: EuiSelectOption[] = [
  { value: AssociatedFilter.all, text: 'All' },
  { value: AssociatedFilter.documentOnly, text: 'Attached to document only' },
  { value: AssociatedFilter.savedObjectOnly, text: 'Attached to timeline only' },
  { value: AssociatedFilter.documentAndSavedObject, text: 'Attached to document and timeline' },
  { value: AssociatedFilter.orphan, text: 'Orphan' },
];

export const SearchRow = React.memo(() => {
  const dispatch = useDispatch();
  const associatedSelectId = useGeneratedHtmlId({ prefix: 'associatedSelectId' });

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

  const onAssociatedNoteSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch(userFilterAssociatedNotes(e.target.value as AssociatedFilter));
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
      <EuiFlexItem grow={false}>
        <EuiSelect
          id={associatedSelectId}
          options={associatedNoteSelectOptions}
          onChange={onAssociatedNoteSelectChange}
          prepend={FILTER_SELECT}
          aria-label={FILTER_SELECT}
          data-test-subj={ASSOCIATED_NOT_SELECT_TEST_ID}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SearchRow.displayName = 'SearchRow';

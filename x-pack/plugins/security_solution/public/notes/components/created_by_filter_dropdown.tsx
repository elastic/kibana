/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiComboBox, EuiToolTip } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { useLicense } from '../../common/hooks/use_license';
import { useUpsellingMessage } from '../../common/hooks/use_upselling';
import { CREATED_BY_SELECT_TEST_ID } from './test_ids';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';
import { userFilterCreatedBy } from '..';

export const CREATED_BY = i18n.translate('xpack.securitySolution.notes.createdByDropdownLabel', {
  defaultMessage: 'Created by',
});

interface User {
  /**
   * uuid of the UserProfile
   */
  id: string;
  /**
   * full_name || email || username of the UserProfile
   */
  label: string;
}

export const CreatedByFilterDropdown = React.memo(() => {
  const dispatch = useDispatch();
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const upsellingMessage = useUpsellingMessage('note_management_user_filter');

  const { isLoading, data } = useSuggestUsers({
    searchTerm: '',
    enabled: isPlatinumPlus,
  });

  const users: User[] = useMemo(
    () =>
      (data || []).map((userProfile: UserProfileWithAvatar) => ({
        id: userProfile.uid,
        label: userProfile.user.full_name || userProfile.user.email || userProfile.user.username,
      })),
    [data]
  );

  const [selectedUser, setSelectedUser] = useState<Array<EuiComboBoxOptionOption<User>>>();
  const onChange = useCallback(
    (user: Array<EuiComboBoxOptionOption<User>>) => {
      setSelectedUser(user);
      dispatch(userFilterCreatedBy(user.length > 0 ? (user[0].id as string) : ''));
    },
    [dispatch]
  );

  const dropdown = useMemo(
    () => (
      <EuiComboBox
        prepend={CREATED_BY}
        singleSelection={{ asPlainText: true }}
        options={users}
        selectedOptions={selectedUser}
        onChange={onChange}
        isLoading={isPlatinumPlus && isLoading}
        isDisabled={!isPlatinumPlus}
        data-test-subj={CREATED_BY_SELECT_TEST_ID}
      />
    ),
    [isLoading, isPlatinumPlus, onChange, selectedUser, users]
  );

  return (
    <>
      {isPlatinumPlus ? (
        <>{dropdown}</>
      ) : (
        <EuiToolTip position="bottom" content={upsellingMessage}>
          {dropdown}
        </EuiToolTip>
      )}
    </>
  );
});

CreatedByFilterDropdown.displayName = 'CreatedByFilterDropdown';

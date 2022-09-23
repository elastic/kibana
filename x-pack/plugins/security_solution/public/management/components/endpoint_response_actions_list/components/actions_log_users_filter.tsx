/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import { EuiFieldSearch, EuiFormControlLayout } from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { FILTER_NAMES } from '../translations';
import { useActionHistoryUrlParams } from './use_action_history_url_params';

export const ActionsLogUsersFilter = memo(
  ({
    isFlyout,
    onChangeUsersFilter,
  }: {
    isFlyout: boolean;
    onChangeUsersFilter: (selectedUserIds: string[]) => void;
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
    const { users: usersFromUrlParams, setUrlUsersFilters } = useActionHistoryUrlParams();
    const [searchValue, setSearchValue] = useState('');

    const onChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
      },
      [setSearchValue]
    );

    const onSearch = useCallback(() => {
      const userIds = searchValue.split(',').reduce<string[]>((acc, curr) => {
        if (curr.trim() !== '') {
          acc.push(curr.trim());
        }
        return acc;
      }, []);
      onChangeUsersFilter(userIds);
      if (!isFlyout) {
        setUrlUsersFilters(userIds.join(','));
      }
    }, [isFlyout, onChangeUsersFilter, searchValue, setUrlUsersFilters]);

    const onClear = useCallback(() => {
      setSearchValue('');
      onChangeUsersFilter([]);
      if (!isFlyout) {
        setUrlUsersFilters('');
      }
    }, [isFlyout, onChangeUsersFilter, setUrlUsersFilters, setSearchValue]);

    // on load with users in urlParams, set the search value
    useEffect(() => {
      if (usersFromUrlParams && usersFromUrlParams.length > 0) {
        setSearchValue(usersFromUrlParams.join(','));
      }
      // do this only once on load
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <EuiFormControlLayout clear={{ onClick: onClear }} fullWidth>
        <EuiFieldSearch
          data-test-subj={getTestId('users-filter-search')}
          isClearable
          fullWidth
          placeholder={FILTER_NAMES.users}
          onChange={onChange}
          onSearch={onSearch}
          value={searchValue}
        />
      </EuiFormControlLayout>
    );
  }
);

ActionsLogUsersFilter.displayName = 'ActionsLogUsersFilter';

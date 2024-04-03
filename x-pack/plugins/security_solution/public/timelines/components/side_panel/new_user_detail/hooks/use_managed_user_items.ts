/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { UserAssetTableType } from '../../../../../explore/users/store/model';
import type { State } from '../../../../../common/store/types';
import { usersSelectors } from '../../../../../explore/users/store';
import type { ManagedUserTable } from '../types';
import type { ManagedUserFields } from '../../../../../../common/search_strategy/security_solution/users/managed_details';

export const useManagedUserItems = (
  tableType: UserAssetTableType,
  managedUserDetails: ManagedUserFields
): ManagedUserTable[] | null => {
  const tableData = useSelector((state: State) =>
    usersSelectors.selectUserAssetTableById(state, tableType)
  );

  return useMemo(
    () =>
      tableData.fields.map((fieldName) => ({
        value: managedUserDetails[fieldName],
        field: fieldName,
      })),
    [managedUserDetails, tableData.fields]
  );
};

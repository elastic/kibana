/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AppLogic, IAppValues } from 'workplace_search/App/AppLogic';
import { GroupsLogic, IGroupsActions, IGroupsValues } from '../GroupsLogic';

import TableFilterSourcesDropdown from './TableFilterSourcesDropdown';
import TableFilterUsersDropdown from './TableFilterUsersDropdown';

const PLACEHOLDER = 'Filter groups by name...';

export const TableFilters: React.FC<{}> = () => {
  const { setFilterValue } = useActions(GroupsLogic) as IGroupsActions;
  const { filterValue } = useValues(GroupsLogic) as IGroupsValues;
  const { isFederatedAuth } = useValues(AppLogic) as IAppValues;

  const handleSearchChange = (e) => setFilterValue(e.target.value);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem className="user-groups-filters__search-bar">
            <EuiFieldSearch
              value={filterValue}
              onChange={handleSearchChange}
              fullWidth={true}
              placeholder={PLACEHOLDER}
            />
          </EuiFlexItem>
          <EuiFlexItem className="user-groups-filters__filter-sources">
            <TableFilterSourcesDropdown />
          </EuiFlexItem>
          {!isFederatedAuth && (
            <EuiFlexItem>
              <TableFilterUsersDropdown />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

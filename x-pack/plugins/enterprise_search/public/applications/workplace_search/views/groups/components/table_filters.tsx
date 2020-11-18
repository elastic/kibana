/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import { GroupsLogic } from '../groups_logic';

import { TableFilterSourcesDropdown } from './table_filter_sources_dropdown';
import { TableFilterUsersDropdown } from './table_filter_users_dropdown';

const FILTER_GROUPS_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.filterGroups.placeholder',
  {
    defaultMessage: 'Filter groups by name...',
  }
);

export const TableFilters: React.FC = () => {
  const { setFilterValue } = useActions(GroupsLogic);
  const { filterValue } = useValues(GroupsLogic);
  const { isFederatedAuth } = useValues(AppLogic);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem className="user-groups-filters__search-bar">
            <EuiFieldSearch
              value={filterValue}
              onChange={handleSearchChange}
              fullWidth={true}
              placeholder={FILTER_GROUPS_PLACEHOLDER}
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

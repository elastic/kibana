/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions } from 'kea';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';

import { GroupsLogic } from '../groups_logic';

const CLEAR_FILTERS = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.clearFilters.action',
  {
    defaultMessage: 'Clear Filters',
  }
);

export const ClearFiltersLink: React.FC<{}> = () => {
  const { resetGroupsFilters } = useActions(GroupsLogic);

  return (
    <EuiLink onClick={resetGroupsFilters}>
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs" component="span">
        <EuiFlexItem component="span" grow={false}>
          <small>
            <EuiIcon type="cross" />
          </small>
        </EuiFlexItem>
        <EuiFlexItem component="span" grow={false}>
          <small>{CLEAR_FILTERS}</small>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { EuiIconTip, EuiInMemoryTable, EuiBasicTableColumn } from '@elastic/eui';
import type { EuiSearchBarOnChangeArgs } from '@elastic/eui';

import { ASRoleMapping } from '../../app_search/types';
import { WSRoleMapping } from '../../workplace_search/types';
import { ACTIONS_HEADER } from '../constants';
import { RoleRules } from '../types';

import './role_mappings_table.scss';

import {
  ROLE_LABEL,
  ALL_LABEL,
  EXTERNAL_ATTRIBUTE_LABEL,
  ATTRIBUTE_VALUE_LABEL,
  FILTER_ROLE_MAPPINGS_PLACEHOLDER,
  ROLE_MAPPINGS_NO_RESULTS_MESSAGE,
  EXTERNAL_ATTRIBUTE_TOOLTIP,
} from './constants';
import { UsersAndRolesRowActions } from './users_and_roles_row_actions';

interface AccessItem {
  name: string;
}

interface SharedRoleMapping extends ASRoleMapping, WSRoleMapping {
  accessItems: AccessItem[];
}

interface Props {
  accessItemKey: 'groups' | 'engines';
  accessHeader: string;
  roleMappings: Array<ASRoleMapping | WSRoleMapping>;
  accessAllEngines?: boolean;
  initializeRoleMapping(roleMappingId: string): void;
  handleDeleteMapping(roleMappingId: string): void;
}

export const RoleMappingsTable: React.FC<Props> = ({
  accessItemKey,
  accessHeader,
  roleMappings,
  initializeRoleMapping,
  handleDeleteMapping,
}) => {
  const getFirstAttributeName = (rules: RoleRules): string => Object.entries(rules)[0][0];
  const getFirstAttributeValue = (rules: RoleRules): string => Object.entries(rules)[0][1];

  // This is needed because App Search has `engines` and Workplace Search has `groups`.
  const standardizedRoleMappings = (roleMappings as SharedRoleMapping[]).map((rm) => {
    const _rm = { ...rm } as SharedRoleMapping;
    _rm.accessItems = rm[accessItemKey];
    return _rm;
  }) as SharedRoleMapping[];

  const [items, setItems] = useState([] as SharedRoleMapping[]);

  useEffect(() => {
    setItems(standardizedRoleMappings);
  }, [roleMappings]);

  const attributeNameCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'attribute',
    name: (
      <span>
        {EXTERNAL_ATTRIBUTE_LABEL}{' '}
        <EuiIconTip
          type="iInCircle"
          color="subdued"
          content={EXTERNAL_ATTRIBUTE_TOOLTIP}
          iconProps={{
            className: 'eui-alignTop',
          }}
        />
      </span>
    ),
    render: (_, { rules }: SharedRoleMapping) => getFirstAttributeName(rules),
  };

  const attributeValueCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'attributeValue',
    name: ATTRIBUTE_VALUE_LABEL,
    render: (_, { rules }: SharedRoleMapping) => getFirstAttributeValue(rules),
  };

  const roleCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'roleType',
    name: ROLE_LABEL,
    render: (_, { roleType }: SharedRoleMapping) => roleType,
  };

  const accessItemsCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'accessItems',
    name: accessHeader,
    render: (_, { accessAllEngines, accessItems }: SharedRoleMapping) => {
      // Design calls for showing the first 2 items followed by a +x after those 2.
      // ['foo', 'bar', 'baz'] would display as: "foo, bar + 1"
      const numItems = accessItems.length;
      if (accessAllEngines || numItems === 0)
        return <span data-test-subj="AllItems">{ALL_LABEL}</span>;
      const additionalItems = numItems > 2 ? ` + ${numItems - 2}` : '';
      const names = accessItems.map((item) => item.name);
      return (
        <span data-test-subj="AccessItems">{names.slice(0, 2).join(', ') + additionalItems}</span>
      );
    },
  };

  const actionsCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'id',
    name: ACTIONS_HEADER,
    align: 'right',
    render: (_, { id, toolTip }: SharedRoleMapping) => (
      <>
        {id && (
          <UsersAndRolesRowActions
            onManageClick={() => initializeRoleMapping(id)}
            onDeleteClick={() => handleDeleteMapping(id)}
          />
        )}
        {toolTip && <EuiIconTip position="left" content={toolTip.content} />}
      </>
    ),
  };

  const columns = [attributeNameCol, attributeValueCol, roleCol, accessItemsCol, actionsCol];

  const pagination = {
    showPerPageOptions: false,
    pageSize: 10,
  };

  const onQueryChange = ({ queryText }: EuiSearchBarOnChangeArgs) => {
    const filteredItems = standardizedRoleMappings.filter((rm) => {
      // JSON.stringify allows us to search all the object fields
      // without converting all the nested arrays and objects to strings manually
      // Some false-positives are possible, because the search is also performed on
      // object keys, but the simplicity of JSON.stringify seems to worth the tradeoff.
      const normalizedTableItemString = JSON.stringify(rm).toLowerCase();
      const normalizedQuery = queryText.toLowerCase();
      return normalizedTableItemString.indexOf(normalizedQuery) !== -1;
    });

    setItems(filteredItems);
  };

  const search = {
    onChange: onQueryChange,
    box: {
      incremental: true,
      fullWidth: false,
      placeholder: FILTER_ROLE_MAPPINGS_PLACEHOLDER,
      'data-test-subj': 'RoleMappingsTableSearchInput',
    },
  };
  return (
    <EuiInMemoryTable
      data-test-subj="RoleMappingsTable"
      columns={columns}
      items={items}
      search={search}
      pagination={pagination}
      message={ROLE_MAPPINGS_NO_RESULTS_MESSAGE}
      responsive={false}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiIconTip, EuiTextColor, EuiInMemoryTable, EuiBasicTableColumn } from '@elastic/eui';

import { ASRoleMapping } from '../../app_search/types';
import { WSRoleMapping } from '../../workplace_search/types';
import { RoleRules } from '../types';

import './role_mappings_table.scss';

import {
  ANY_AUTH_PROVIDER,
  ANY_AUTH_PROVIDER_OPTION_LABEL,
  ROLE_LABEL,
  ALL_LABEL,
  AUTH_PROVIDER_LABEL,
  EXTERNAL_ATTRIBUTE_LABEL,
  ATTRIBUTE_VALUE_LABEL,
  FILTER_ROLE_MAPPINGS_PLACEHOLDER,
  ROLE_MAPPINGS_NO_RESULTS_MESSAGE,
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
  shouldShowAuthProvider?: boolean;
  initializeRoleMapping(roleMappingId: string): void;
  handleDeleteMapping(roleMappingId: string): void;
}

const noItemsPlaceholder = <EuiTextColor color="subdued">&mdash;</EuiTextColor>;

const getAuthProviderDisplayValue = (authProvider: string) =>
  authProvider === ANY_AUTH_PROVIDER ? ANY_AUTH_PROVIDER_OPTION_LABEL : authProvider;

export const RoleMappingsTable: React.FC<Props> = ({
  accessItemKey,
  accessHeader,
  roleMappings,
  shouldShowAuthProvider,
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

  const attributeNameCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'attribute',
    name: EXTERNAL_ATTRIBUTE_LABEL,
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
    render: (_, { accessAllEngines, accessItems }: SharedRoleMapping) => (
      <span data-test-subj="AccessItemsList">
        {accessAllEngines ? (
          ALL_LABEL
        ) : (
          <>
            {accessItems.length === 0
              ? noItemsPlaceholder
              : accessItems.map(({ name }) => (
                  <Fragment key={name}>
                    {name}
                    <br />
                  </Fragment>
                ))}
          </>
        )}
      </span>
    ),
  };

  const authProviderCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'authProvider',
    name: AUTH_PROVIDER_LABEL,
    render: (_, { authProvider }: SharedRoleMapping) => (
      <span data-test-subj="AuthProviderDisplayValue">
        {authProvider.map(getAuthProviderDisplayValue).join(', ')}
      </span>
    ),
  };

  const actionsCol: EuiBasicTableColumn<SharedRoleMapping> = {
    field: 'id',
    name: '',
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

  const columns = shouldShowAuthProvider
    ? [attributeNameCol, attributeValueCol, roleCol, accessItemsCol, authProviderCol, actionsCol]
    : [attributeNameCol, attributeValueCol, roleCol, accessItemsCol, actionsCol];

  const pagination = {
    hidePerPageOptions: true,
  };

  const search = {
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
      items={standardizedRoleMappings}
      search={search}
      pagination={pagination}
      message={ROLE_MAPPINGS_NO_RESULTS_MESSAGE}
      responsive={false}
    />
  );
};

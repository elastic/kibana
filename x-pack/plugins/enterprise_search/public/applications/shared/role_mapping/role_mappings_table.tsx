/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiTextColor,
} from '@elastic/eui';

import { ASRoleMapping } from '../../app_search/types';
import { RoleRules } from '../../shared/types';
import { WSRoleMapping } from '../../workplace_search/types';

import { ANY_AUTH_PROVIDER, ANY_AUTH_PROVIDER_LABEL } from './constants';

interface IAccessItem {
  name: string;
}

interface SharedRoleMapping extends ASRoleMapping, WSRoleMapping {
  accessItems: IAccessItem[];
}

interface IRoleMappingsTableProps {
  accessItemKey: 'groups' | 'engines';
  accessHeader: string;
  roleMappings: SharedRoleMapping[];
  addMappingButton: React.ReactNode;
  accessAllEngines?: boolean;
  myRole?: IRole;
  shouldShowAuthProvider?: boolean;
  getRoleMappingPath(roleId: string);
}

const MAX_CELL_WIDTH = 24;

const noItemsPlaceholder = <EuiTextColor color="subdued">&mdash;</EuiTextColor>;

const getAuthProviderDisplayValue = (authProvider) =>
  authProvider === ANY_AUTH_PROVIDER ? ANY_AUTH_PROVIDER_LABEL : authProvider;

export const RoleMappingsTable: React.FC<IRoleMappingsTableProps> = ({
  accessItemKey,
  accessHeader,
  roleMappings,
  addMappingButton,
  getRoleMappingPath,
  myRole,
  shouldShowAuthProvider,
}) => {
  const [filterValue, updateValue] = useState('');

  // This is needed because SMAS has `engines` and SMES has `groups`.
  const standardizeRoleMapping = roleMappings.map((rm) => {
    const _rm = { ...rm } as IObject;
    _rm.accessItems = rm[accessItemKey];
    return _rm;
  }) as SharedRoleMapping[];

  const filterResults = (result) => {
    const values = Object.values(result) as string[];
    const regexp = new RegExp(filterValue, 'i');
    return values.filter((x) => regexp.test(x)).length > 0;
  };

  const filteredResults = standardizeRoleMapping.filter(filterResults) as ISharedRoleMapping[];
  const getFirstAttributeName = (rules): string => Object.entries(rules)[0][0];
  const getFirstAttributeValue = (rules): string => Object.entries(rules)[0][1] as string;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFieldSearch
            value={filterValue}
            placeholder="Filter roles..."
            onChange={(e) => updateValue(e.target.value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{addMappingButton}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {filteredResults.length > 0 ? (
        <EuiTable>
          <EuiTableHeader>
            <EuiTableHeaderCell>External Attribute</EuiTableHeaderCell>
            <EuiTableHeaderCell>Attribute Value</EuiTableHeaderCell>
            <EuiTableHeaderCell>Role</EuiTableHeaderCell>
            <EuiTableHeaderCell>{accessHeader}</EuiTableHeaderCell>
            {shouldShowAuthProvider && <EuiTableHeaderCell>Auth Provider</EuiTableHeaderCell>}
            <EuiTableHeaderCell />
          </EuiTableHeader>
          <EuiTableBody>
            {filteredResults.map(
              ({ id, authProvider, rules, roleType, accessAllEngines, accessItems, toolTip }) => (
                <EuiTableRow key={id}>
                  <EuiTableRowCell>{getFirstAttributeName(rules)}</EuiTableRowCell>
                  <EuiTableRowCell style={{ maxWidth: MAX_CELL_WIDTH }}>
                    {getFirstAttributeValue(rules)}
                  </EuiTableRowCell>
                  <EuiTableRowCell>{roleType}</EuiTableRowCell>
                  <EuiTableRowCell style={{ maxWidth: MAX_CELL_WIDTH }}>
                    {accessAllEngines ? (
                      'All'
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
                  </EuiTableRowCell>
                  {shouldShowAuthProvider && (
                    <EuiTableRowCell>
                      {authProvider.map(getAuthProviderDisplayValue).join(', ')}
                    </EuiTableRowCell>
                  )}
                  <EuiTableRowCell>
                    {(!myRole || myRole.ability.invitableRoleTypes().includes(roleType)) && id && (
                      <Link to={getRoleMappingPath(id)}>Manage</Link>
                    )}
                    {(!myRole || myRole.ability.invitableRoleTypes().includes(roleType)) &&
                      toolTip && <EuiIconTip position="left" content={toolTip.content} />}
                  </EuiTableRowCell>
                </EuiTableRow>
              )
            )}
          </EuiTableBody>
        </EuiTable>
      ) : (
        <p>No results found for &apos;{filterValue}&apos;</p>
      )}
    </>
  );
};

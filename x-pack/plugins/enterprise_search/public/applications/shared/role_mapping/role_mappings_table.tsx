/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';

import {
  EuiButtonIcon,
  EuiFieldSearch,
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
import { i18n } from '@kbn/i18n';

import { ASRoleMapping } from '../../app_search/types';
import { WSRoleMapping } from '../../workplace_search/types';
import { MANAGE_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../constants';
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
} from './constants';

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

const MAX_CELL_WIDTH = 24;

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
  const [filterValue, updateValue] = useState('');

  // This is needed because App Search has `engines` and Workplace Search has `groups`.
  const standardizeRoleMapping = (roleMappings as SharedRoleMapping[]).map((rm) => {
    const _rm = { ...rm } as SharedRoleMapping;
    _rm.accessItems = rm[accessItemKey];
    return _rm;
  });

  const filterResults = (result: SharedRoleMapping) => {
    // Filter out non-alphanumeric characters, except for underscores, hyphens, and spaces
    const sanitizedValue = filterValue.replace(/[^\w\s-]/g, '');
    const values = Object.values(result);
    const regexp = new RegExp(sanitizedValue, 'i');
    return values.filter((x) => regexp.test(x)).length > 0;
  };

  const filteredResults = standardizeRoleMapping.filter(filterResults);
  const getFirstAttributeName = (rules: RoleRules): string => Object.entries(rules)[0][0];
  const getFirstAttributeValue = (rules: RoleRules): string => Object.entries(rules)[0][1];

  const rowActions = (id: string) => (
    <>
      <EuiButtonIcon
        onClick={() => initializeRoleMapping(id)}
        iconType="pencil"
        aria-label={MANAGE_BUTTON_LABEL}
        data-test-subj="ManageButton"
      />{' '}
      <EuiButtonIcon
        onClick={() => handleDeleteMapping(id)}
        iconType="trash"
        aria-label={DELETE_BUTTON_LABEL}
        data-test-subj="DeleteButton"
      />
    </>
  );

  return (
    <>
      <EuiFieldSearch
        value={filterValue}
        placeholder={FILTER_ROLE_MAPPINGS_PLACEHOLDER}
        onChange={(e) => updateValue(e.target.value)}
      />
      <EuiSpacer />
      {filteredResults.length > 0 ? (
        <EuiTable className="roleMappingsTable">
          <EuiTableHeader>
            <EuiTableHeaderCell>{EXTERNAL_ATTRIBUTE_LABEL}</EuiTableHeaderCell>
            <EuiTableHeaderCell>{ATTRIBUTE_VALUE_LABEL}</EuiTableHeaderCell>
            <EuiTableHeaderCell>{ROLE_LABEL}</EuiTableHeaderCell>
            <EuiTableHeaderCell>{accessHeader}</EuiTableHeaderCell>
            {shouldShowAuthProvider && (
              <EuiTableHeaderCell>{AUTH_PROVIDER_LABEL}</EuiTableHeaderCell>
            )}
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
                  <EuiTableRowCell
                    data-test-subj="AccessItemsList"
                    style={{ maxWidth: MAX_CELL_WIDTH }}
                  >
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
                  </EuiTableRowCell>
                  {shouldShowAuthProvider && (
                    <EuiTableRowCell data-test-subj="AuthProviderDisplay">
                      {authProvider.map(getAuthProviderDisplayValue).join(', ')}
                    </EuiTableRowCell>
                  )}
                  <EuiTableRowCell align="right">
                    {id && rowActions(id)}
                    {toolTip && <EuiIconTip position="left" content={toolTip.content} />}
                  </EuiTableRowCell>
                </EuiTableRow>
              )
            )}
          </EuiTableBody>
        </EuiTable>
      ) : (
        <p>
          {i18n.translate('xpack.enterpriseSearch.roleMapping.moResults.message', {
            defaultMessage: "No results found for '{filterValue}'",
            values: { filterValue },
          })}
        </p>
      )}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import {
  RoleMappingsTable,
  RoleMappingsHeading,
  RolesEmptyPrompt,
  UsersTable,
  UsersHeading,
  UsersEmptyPrompt,
} from '../../../shared/role_mapping';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';

import { SECURITY_DOCS_URL } from '../../routes';
import { AppSearchPageTemplate } from '../layout';

import { ROLE_MAPPINGS_ENGINE_ACCESS_HEADING } from './constants';
import { RoleMapping } from './role_mapping';
import { RoleMappingsLogic } from './role_mappings_logic';
import { User } from './user';

export const RoleMappings: React.FC = () => {
  const {
    enableRoleBasedAccess,
    initializeRoleMappings,
    initializeRoleMapping,
    initializeSingleUserRoleMapping,
    handleDeleteMapping,
    resetState,
  } = useActions(RoleMappingsLogic);
  const {
    roleMappings,
    singleUserRoleMappings,
    dataLoading,
    roleMappingFlyoutOpen,
    singleUserRoleMappingFlyoutOpen,
  } = useValues(RoleMappingsLogic);

  useEffect(() => {
    initializeRoleMappings();
    return resetState;
  }, []);

  const hasUsers = singleUserRoleMappings.length > 0;

  const rolesEmptyState = (
    <RolesEmptyPrompt
      productName={APP_SEARCH_PLUGIN.NAME}
      docsLink={SECURITY_DOCS_URL}
      onEnable={enableRoleBasedAccess}
    />
  );

  const roleMappingsSection = (
    <section>
      <RoleMappingsHeading
        productName={APP_SEARCH_PLUGIN.NAME}
        docsLink={SECURITY_DOCS_URL}
        onClick={() => initializeRoleMapping()}
      />
      <RoleMappingsTable
        roleMappings={roleMappings}
        accessItemKey="engines"
        accessHeader={ROLE_MAPPINGS_ENGINE_ACCESS_HEADING}
        initializeRoleMapping={initializeRoleMapping}
        handleDeleteMapping={handleDeleteMapping}
      />
    </section>
  );

  const usersTable = (
    <UsersTable
      accessItemKey="engines"
      singleUserRoleMappings={singleUserRoleMappings}
      initializeSingleUserRoleMapping={initializeSingleUserRoleMapping}
      handleDeleteMapping={handleDeleteMapping}
    />
  );

  const usersSection = (
    <>
      <UsersHeading onClick={() => initializeSingleUserRoleMapping()} />
      <EuiSpacer />
      {hasUsers ? usersTable : <UsersEmptyPrompt />}
    </>
  );

  return (
    <AppSearchPageTemplate
      pageChrome={[ROLE_MAPPINGS_TITLE]}
      pageHeader={{ pageTitle: ROLE_MAPPINGS_TITLE }}
      isLoading={dataLoading}
      isEmptyState={roleMappings.length < 1}
      emptyState={rolesEmptyState}
    >
      {roleMappingFlyoutOpen && <RoleMapping />}
      {singleUserRoleMappingFlyoutOpen && <User />}
      {roleMappingsSection}
      <EuiSpacer size="xxl" />
      {usersSection}
    </AppSearchPageTemplate>
  );
};

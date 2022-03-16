/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import {
  RoleMappingsTable,
  RoleMappingsHeading,
  RolesEmptyPrompt,
  UsersTable,
  UsersHeading,
  UsersEmptyPrompt,
} from '../../../shared/role_mapping';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';
import { WorkplaceSearchPageTemplate } from '../../components/layout';

import { ROLE_MAPPINGS_TABLE_HEADER } from './constants';

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
  }, []);

  const hasUsers = singleUserRoleMappings.length > 0;

  const rolesEmptyState = (
    <RolesEmptyPrompt
      productName={WORKPLACE_SEARCH_PLUGIN.NAME}
      docsLink={docLinks.workplaceSearchSecurity}
      onEnable={enableRoleBasedAccess}
    />
  );

  const roleMappingsSection = (
    <section>
      <RoleMappingsHeading
        productName={WORKPLACE_SEARCH_PLUGIN.NAME}
        docsLink={docLinks.workplaceSearchSecurity}
        onClick={() => initializeRoleMapping()}
      />
      <RoleMappingsTable
        roleMappings={roleMappings}
        accessItemKey="groups"
        accessHeader={ROLE_MAPPINGS_TABLE_HEADER}
        initializeRoleMapping={initializeRoleMapping}
        handleDeleteMapping={handleDeleteMapping}
      />
    </section>
  );

  const usersTable = (
    <UsersTable
      accessItemKey="groups"
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
    <WorkplaceSearchPageTemplate
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
    </WorkplaceSearchPageTemplate>
  );
};

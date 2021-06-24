/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import {
  RoleMappingsTable,
  RoleMappingsHeading,
  RolesEmptyPrompt,
} from '../../../shared/role_mapping';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';

import { DOCS_PREFIX } from '../../routes';
import { AppSearchPageTemplate } from '../layout';

import { ROLE_MAPPINGS_ENGINE_ACCESS_HEADING } from './constants';
import { RoleMapping } from './role_mapping';
import { RoleMappingsLogic } from './role_mappings_logic';

const ROLES_DOCS_LINK = `${DOCS_PREFIX}/security-and-users.html`;

export const RoleMappings: React.FC = () => {
  const {
    enableRoleBasedAccess,
    initializeRoleMappings,
    initializeRoleMapping,
    handleDeleteMapping,
    resetState,
  } = useActions(RoleMappingsLogic);
  const {
    roleMappings,
    multipleAuthProvidersConfig,
    dataLoading,
    roleMappingFlyoutOpen,
  } = useValues(RoleMappingsLogic);

  useEffect(() => {
    initializeRoleMappings();
    return resetState;
  }, []);

  const rolesEmptyState = (
    <RolesEmptyPrompt
      productName={APP_SEARCH_PLUGIN.NAME}
      docsLink={ROLES_DOCS_LINK}
      onEnable={enableRoleBasedAccess}
    />
  );

  const roleMappingsSection = (
    <section>
      <RoleMappingsHeading
        productName={APP_SEARCH_PLUGIN.NAME}
        docsLink={ROLES_DOCS_LINK}
        onClick={() => initializeRoleMapping()}
      />
      <RoleMappingsTable
        roleMappings={roleMappings}
        accessItemKey="engines"
        accessHeader={ROLE_MAPPINGS_ENGINE_ACCESS_HEADING}
        initializeRoleMapping={initializeRoleMapping}
        shouldShowAuthProvider={multipleAuthProvidersConfig}
        handleDeleteMapping={handleDeleteMapping}
      />
    </section>
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
      {roleMappingsSection}
    </AppSearchPageTemplate>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { RoleMappingsTable, RoleMappingsHeading } from '../../../shared/role_mapping';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';
import { AppSearchPageTemplate } from '../layout';

import { ROLE_MAPPINGS_ENGINE_ACCESS_HEADING } from './constants';
import { RoleMapping } from './role_mapping';
import { RoleMappingsLogic } from './role_mappings_logic';

export const RoleMappings: React.FC = () => {
  const {
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

  const roleMappingsSection = (
    <section>
      <RoleMappingsHeading
        productName={APP_SEARCH_PLUGIN.NAME}
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
    >
      {roleMappingFlyoutOpen && <RoleMapping />}
      {roleMappingsSection}
    </AppSearchPageTemplate>
  );
};

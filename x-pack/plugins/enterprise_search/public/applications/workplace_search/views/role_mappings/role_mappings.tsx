/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { RoleMappingsTable, RoleMappingsHeading } from '../../../shared/role_mapping';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';
import { WorkplaceSearchPageTemplate } from '../../components/layout';

import { ROLE_MAPPINGS_TABLE_HEADER } from './constants';

import { RoleMapping } from './role_mapping';
import { RoleMappingsLogic } from './role_mappings_logic';

export const RoleMappings: React.FC = () => {
  const { initializeRoleMappings, initializeRoleMapping, handleDeleteMapping } = useActions(
    RoleMappingsLogic
  );

  const {
    roleMappings,
    dataLoading,
    multipleAuthProvidersConfig,
    roleMappingFlyoutOpen,
  } = useValues(RoleMappingsLogic);

  useEffect(() => {
    initializeRoleMappings();
  }, []);

  const roleMappingsSection = (
    <section>
      <RoleMappingsHeading
        productName={WORKPLACE_SEARCH_PLUGIN.NAME}
        onClick={() => initializeRoleMapping()}
      />
      <RoleMappingsTable
        roleMappings={roleMappings}
        accessItemKey="groups"
        accessHeader={ROLE_MAPPINGS_TABLE_HEADER}
        shouldShowAuthProvider={multipleAuthProvidersConfig}
        initializeRoleMapping={initializeRoleMapping}
        handleDeleteMapping={handleDeleteMapping}
      />
    </section>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[ROLE_MAPPINGS_TITLE]}
      pageHeader={{ pageTitle: ROLE_MAPPINGS_TITLE }}
      isLoading={dataLoading}
    >
      {roleMappingFlyoutOpen && <RoleMapping />}
      {roleMappingsSection}
    </WorkplaceSearchPageTemplate>
  );
};

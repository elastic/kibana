/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import FlashMessages from 'shared/components/FlashMessages';
import { AddRoleMappingButton, RoleMappingsTable } from 'shared/components/RoleMapping';

import { Loading, ViewContentHeader } from 'workplace_search/components';
import { getRoleMappingPath, ROLE_MAPPING_NEW_PATH } from 'workplace_search/utils/routePaths';

import { EuiEmptyPrompt } from '@elastic/eui';

import { RoleMappingsLogic } from './RoleMappingsLogic';

export const RoleMappings: React.FC = () => {
  const { initializeRoleMappings } = useActions(RoleMappingsLogic);

  const { roleMappings, dataLoading, multipleAuthProvidersConfig, flashMessages } = useValues(
    RoleMappingsLogic
  );

  useEffect(() => {
    initializeRoleMappings();
  }, []);

  if (dataLoading) return <Loading />;

  const addMappingButton = <AddRoleMappingButton path={ROLE_MAPPING_NEW_PATH} />;
  const emptyPrompt = (
    <EuiEmptyPrompt
      iconType="usersRolesApp"
      title={<h2>No role mappings yet</h2>}
      body={
        <p>
          New team members are assigned the admin role by default. An admin can access everything.
          Create a new role to override the default.
        </p>
      }
      actions={addMappingButton}
    />
  );
  const roleMappingsTable = (
    <RoleMappingsTable
      roleMappings={roleMappings}
      accessItemKey="groups"
      accessHeader="Group Access"
      addMappingButton={addMappingButton}
      getRoleMappingPath={getRoleMappingPath}
      shouldShowAuthProvider={multipleAuthProvidersConfig}
    />
  );

  return (
    <>
      <ViewContentHeader
        title="Users &amp; roles"
        description="Define role mappings for elasticsearch-native and elasticsearch-saml authentication."
      />
      <div>
        {flashMessages && <FlashMessages {...flashMessages} />}
        {roleMappings.length === 0 ? emptyPrompt : roleMappingsTable}
      </div>
    </>
  );
};

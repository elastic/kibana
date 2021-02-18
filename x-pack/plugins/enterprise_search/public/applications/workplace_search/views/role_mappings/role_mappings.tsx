/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { Loading } from '../../../shared/loading';
import { AddRoleMappingButton, RoleMappingsTable } from '../../../shared/role_mapping';
import { ViewContentHeader } from '../../components/shared/view_content_header';
import { getRoleMappingPath, ROLE_MAPPING_NEW_PATH } from '../../routes';

import { RoleMappingsLogic } from './role_mappings_logic';

export const RoleMappings: React.FC = () => {
  const { initializeRoleMappings } = useActions(RoleMappingsLogic);

  const { roleMappings, dataLoading, multipleAuthProvidersConfig } = useValues(RoleMappingsLogic);

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
        <FlashMessages />
        {roleMappings.length === 0 ? emptyPrompt : roleMappingsTable}
      </div>
    </>
  );
};

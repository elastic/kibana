/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { RoleMappingsTable, RoleMappingsHeading } from '../../../shared/role_mapping';
import { ROLE_MAPPINGS_TITLE } from '../../../shared/role_mapping/constants';

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

  if (dataLoading) return <Loading />;

  const roleMappingsSection = (
    <>
      <RoleMappingsHeading productName="App Search" onClick={() => initializeRoleMapping()} />
      <RoleMappingsTable
        roleMappings={roleMappings}
        accessItemKey="engines"
        accessHeader={ROLE_MAPPINGS_ENGINE_ACCESS_HEADING}
        initializeRoleMapping={initializeRoleMapping}
        shouldShowAuthProvider={multipleAuthProvidersConfig}
        handleDeleteMapping={handleDeleteMapping}
      />
    </>
  );

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE]} />
      {roleMappingFlyoutOpen && <RoleMapping />}
      <FlashMessages />
      {roleMappingsSection}
    </>
  );
};

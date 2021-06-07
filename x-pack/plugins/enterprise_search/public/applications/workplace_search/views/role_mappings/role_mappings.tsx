/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { RoleMappingsTable } from '../../../shared/role_mapping';
import {
  EMPTY_ROLE_MAPPINGS_TITLE,
  ROLE_MAPPING_ADD_BUTTON,
  ROLE_MAPPINGS_TITLE,
  ROLE_MAPPINGS_DESCRIPTION,
} from '../../../shared/role_mapping/constants';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { EMPTY_ROLE_MAPPINGS_BODY, ROLE_MAPPINGS_TABLE_HEADER } from './constants';

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

  if (dataLoading) return <Loading />;

  const addMappingButton = (
    <EuiButton fill onClick={() => initializeRoleMapping()}>
      {ROLE_MAPPING_ADD_BUTTON}
    </EuiButton>
  );
  const emptyPrompt = (
    <EuiPanel paddingSize="l" color="subdued" hasBorder={false}>
      <EuiEmptyPrompt
        iconType="usersRolesApp"
        title={<h2>{EMPTY_ROLE_MAPPINGS_TITLE}</h2>}
        body={<p>{EMPTY_ROLE_MAPPINGS_BODY}</p>}
        actions={addMappingButton}
      />
    </EuiPanel>
  );
  const roleMappingsTable = (
    <RoleMappingsTable
      roleMappings={roleMappings}
      accessItemKey="groups"
      accessHeader={ROLE_MAPPINGS_TABLE_HEADER}
      shouldShowAuthProvider={multipleAuthProvidersConfig}
      initializeRoleMapping={initializeRoleMapping}
      handleDeleteMapping={handleDeleteMapping}
    />
  );

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE]} />
      <ViewContentHeader title={ROLE_MAPPINGS_TITLE} description={ROLE_MAPPINGS_DESCRIPTION} />

      {roleMappingFlyoutOpen && <RoleMapping />}
      <div>
        <FlashMessages />
        {roleMappings.length === 0 ? emptyPrompt : roleMappingsTable}
      </div>
    </>
  );
};

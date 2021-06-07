/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPanel,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { RoleMappingsTable } from '../../../shared/role_mapping';
import {
  EMPTY_ROLE_MAPPINGS_TITLE,
  ROLE_MAPPING_ADD_BUTTON,
  ROLE_MAPPINGS_TITLE,
  ROLE_MAPPINGS_DESCRIPTION,
} from '../../../shared/role_mapping/constants';

import { ROLE_MAPPINGS_ENGINE_ACCESS_HEADING, EMPTY_ROLE_MAPPINGS_BODY } from './constants';
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

  const addMappingButton = (
    <EuiButton fill onClick={() => initializeRoleMapping()}>
      {ROLE_MAPPING_ADD_BUTTON}
    </EuiButton>
  );

  const roleMappingEmptyState = (
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
      accessItemKey="engines"
      accessHeader={ROLE_MAPPINGS_ENGINE_ACCESS_HEADING}
      addMappingButton={addMappingButton}
      initializeRoleMapping={initializeRoleMapping}
      shouldShowAuthProvider={multipleAuthProvidersConfig}
      handleDeleteMapping={handleDeleteMapping}
    />
  );

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE]} />
      <EuiPageHeader pageTitle={ROLE_MAPPINGS_TITLE} description={ROLE_MAPPINGS_DESCRIPTION} />

      {roleMappingFlyoutOpen && <RoleMapping />}
      <EuiPageContent hasShadow={false} hasBorder={roleMappings.length > 0}>
        <EuiPageContentBody>
          <FlashMessages />
          {roleMappings.length === 0 ? roleMappingEmptyState : roleMappingsTable}
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};

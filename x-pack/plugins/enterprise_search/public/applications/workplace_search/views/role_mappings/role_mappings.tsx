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
import {
  EMPTY_ROLE_MAPPINGS_TITLE,
  ROLE_MAPPINGS_TITLE,
  ROLE_MAPPINGS_DESCRIPTION,
} from '../../../shared/role_mapping/constants';
import { ViewContentHeader } from '../../components/shared/view_content_header';
import { getRoleMappingPath, ROLE_MAPPING_NEW_PATH } from '../../routes';

import { EMPTY_ROLE_MAPPINGS_BODY, ROLE_MAPPINGS_TABLE_HEADER } from './constants';

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
      title={<h2>{EMPTY_ROLE_MAPPINGS_TITLE}</h2>}
      body={<p>{EMPTY_ROLE_MAPPINGS_BODY}</p>}
      actions={addMappingButton}
    />
  );
  const roleMappingsTable = (
    <RoleMappingsTable
      roleMappings={roleMappings}
      accessItemKey="groups"
      accessHeader={ROLE_MAPPINGS_TABLE_HEADER}
      addMappingButton={addMappingButton}
      getRoleMappingPath={getRoleMappingPath}
      shouldShowAuthProvider={multipleAuthProvidersConfig}
    />
  );

  return (
    <>
      <ViewContentHeader title={ROLE_MAPPINGS_TITLE} description={ROLE_MAPPINGS_DESCRIPTION} />
      <div>
        <FlashMessages />
        {roleMappings.length === 0 ? emptyPrompt : roleMappingsTable}
      </div>
    </>
  );
};

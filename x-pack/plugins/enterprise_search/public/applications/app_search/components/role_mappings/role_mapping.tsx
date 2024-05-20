/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiForm, EuiSpacer } from '@elastic/eui';

import { AttributeSelector, RoleSelector, RoleMappingFlyout } from '../../../shared/role_mapping';
import { AppLogic } from '../../app_logic';
import { AdvanceRoleType } from '../../types';

import { ADVANCED_ROLE_TYPES, STANDARD_ROLE_TYPES } from './constants';
import { EngineAssignmentSelector } from './engine_assignment_selector';
import { RoleMappingsLogic } from './role_mappings_logic';

export const RoleMapping: React.FC = () => {
  const { myRole } = useValues(AppLogic);

  const {
    handleAttributeSelectorChange,
    handleAttributeValueChange,
    handleRoleChange,
    handleSaveMapping,
    closeUsersAndRolesFlyout,
  } = useActions(RoleMappingsLogic);

  const {
    accessAllEngines,
    attributeName,
    attributeValue,
    attributes,
    elasticsearchRoles,
    hasAdvancedRoles,
    roleMapping,
    roleType,
    selectedEngines,
    roleMappingErrors,
    formLoading,
  } = useValues(RoleMappingsLogic);

  const isNew = !roleMapping;
  const hasEngineAssignment = selectedEngines.size > 0 || accessAllEngines;
  const attributeValueInvalid = attributeName !== 'role' && !attributeValue;

  const mapRoleOptions = ({ id, description }: AdvanceRoleType) => ({
    id,
    description,
    disabled: !myRole.availableRoleTypes.includes(id),
  });

  const standardRoleOptions = STANDARD_ROLE_TYPES.map(mapRoleOptions);
  const advancedRoleOptions = ADVANCED_ROLE_TYPES.map(mapRoleOptions);

  const roleOptions = hasAdvancedRoles
    ? [...standardRoleOptions, ...advancedRoleOptions]
    : standardRoleOptions;

  return (
    <RoleMappingFlyout
      disabled={attributeValueInvalid || !hasEngineAssignment}
      formLoading={formLoading}
      isNew={isNew}
      closeUsersAndRolesFlyout={closeUsersAndRolesFlyout}
      handleSaveMapping={handleSaveMapping}
    >
      <EuiForm isInvalid={roleMappingErrors.length > 0} error={roleMappingErrors}>
        <AttributeSelector
          attributeName={attributeName}
          attributeValue={attributeValue}
          attributeValueInvalid={attributeValueInvalid}
          attributes={attributes}
          elasticsearchRoles={elasticsearchRoles}
          disabled={!!roleMapping}
          handleAttributeSelectorChange={handleAttributeSelectorChange}
          handleAttributeValueChange={handleAttributeValueChange}
        />
        <EuiSpacer size="m" />
        <RoleSelector
          roleType={roleType}
          roleOptions={roleOptions}
          onChange={handleRoleChange}
          label="Role"
        />
        {hasAdvancedRoles && <EngineAssignmentSelector />}
      </EuiForm>
    </RoleMappingFlyout>
  );
};

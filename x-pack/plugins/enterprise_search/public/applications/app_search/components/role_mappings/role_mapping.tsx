/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRadioGroup,
  EuiSpacer,
} from '@elastic/eui';

import {
  AttributeSelector,
  RoleSelector,
  RoleOptionLabel,
  RoleMappingFlyout,
} from '../../../shared/role_mapping';
import { AppLogic } from '../../app_logic';
import { AdvanceRoleType } from '../../types';

import { roleHasScopedEngines } from '../../utils/role/has_scoped_engines';

import {
  ADVANCED_ROLE_TYPES,
  STANDARD_ROLE_TYPES,
  ENGINE_REQUIRED_ERROR,
  ALL_ENGINES_LABEL,
  ALL_ENGINES_DESCRIPTION,
  SPECIFIC_ENGINES_LABEL,
  SPECIFIC_ENGINES_DESCRIPTION,
  ENGINE_ASSIGNMENT_LABEL,
} from './constants';
import { RoleMappingsLogic } from './role_mappings_logic';

export const RoleMapping: React.FC = () => {
  const { myRole } = useValues(AppLogic);

  const {
    handleAccessAllEnginesChange,
    handleAttributeSelectorChange,
    handleAttributeValueChange,
    handleAuthProviderChange,
    handleEngineSelectionChange,
    handleRoleChange,
    handleSaveMapping,
    closeRoleMappingFlyout,
  } = useActions(RoleMappingsLogic);

  const {
    accessAllEngines,
    attributeName,
    attributeValue,
    attributes,
    availableAuthProviders,
    availableEngines,
    elasticsearchRoles,
    hasAdvancedRoles,
    multipleAuthProvidersConfig,
    roleMapping,
    roleType,
    selectedEngines,
    selectedAuthProviders,
    selectedOptions,
    roleMappingErrors,
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

  const engineOptions = [
    {
      id: 'all',
      label: <RoleOptionLabel label={ALL_ENGINES_LABEL} description={ALL_ENGINES_DESCRIPTION} />,
    },
    {
      id: 'specific',
      label: (
        <RoleOptionLabel
          label={SPECIFIC_ENGINES_LABEL}
          description={SPECIFIC_ENGINES_DESCRIPTION}
        />
      ),
    },
  ];

  return (
    <RoleMappingFlyout
      disabled={attributeValueInvalid || !hasEngineAssignment}
      isNew={isNew}
      closeRoleMappingFlyout={closeRoleMappingFlyout}
      handleSaveMapping={handleSaveMapping}
    >
      <EuiForm isInvalid={roleMappingErrors.length > 0} error={roleMappingErrors}>
        <AttributeSelector
          attributeName={attributeName}
          attributeValue={attributeValue}
          attributeValueInvalid={attributeValueInvalid}
          attributes={attributes}
          availableAuthProviders={availableAuthProviders}
          elasticsearchRoles={elasticsearchRoles}
          selectedAuthProviders={selectedAuthProviders}
          disabled={!!roleMapping}
          handleAttributeSelectorChange={handleAttributeSelectorChange}
          handleAttributeValueChange={handleAttributeValueChange}
          handleAuthProviderChange={handleAuthProviderChange}
          multipleAuthProvidersConfig={multipleAuthProvidersConfig}
        />
        <EuiSpacer size="m" />
        <RoleSelector
          roleType={roleType}
          roleOptions={roleOptions}
          onChange={handleRoleChange}
          label="Role"
        />

        {hasAdvancedRoles && (
          <>
            <EuiHorizontalRule />
            <EuiFormRow>
              <EuiRadioGroup
                options={engineOptions}
                disabled={!roleHasScopedEngines(roleType)}
                idSelected={accessAllEngines ? 'all' : 'specific'}
                onChange={(id) => handleAccessAllEnginesChange(id === 'all')}
                legend={{
                  children: <span>{ENGINE_ASSIGNMENT_LABEL}</span>,
                }}
              />
            </EuiFormRow>
            <EuiFormRow isInvalid={!hasEngineAssignment} error={[ENGINE_REQUIRED_ERROR]}>
              <EuiComboBox
                data-test-subj="enginesSelect"
                selectedOptions={selectedOptions}
                options={availableEngines.map(({ name }) => ({ label: name, value: name }))}
                onChange={(options) => {
                  handleEngineSelectionChange(options.map(({ value }) => value as string));
                }}
                fullWidth
                isDisabled={accessAllEngines || !roleHasScopedEngines(roleType)}
              />
            </EuiFormRow>
          </>
        )}
      </EuiForm>
    </RoleMappingFlyout>
  );
};

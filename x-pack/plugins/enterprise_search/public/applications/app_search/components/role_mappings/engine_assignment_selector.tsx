/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiComboBox, EuiFormRow, EuiHorizontalRule, EuiRadioGroup } from '@elastic/eui';

import { RoleOptionLabel } from '../../../shared/role_mapping';

import { roleHasScopedEngines } from '../../utils/role/has_scoped_engines';

import {
  ENGINE_REQUIRED_ERROR,
  ALL_ENGINES_LABEL,
  ALL_ENGINES_DESCRIPTION,
  SPECIFIC_ENGINES_LABEL,
  SPECIFIC_ENGINES_DESCRIPTION,
  ENGINE_ASSIGNMENT_LABEL,
} from './constants';
import { RoleMappingsLogic } from './role_mappings_logic';

export const EngineAssignmentSelector: React.FC = () => {
  const { handleAccessAllEnginesChange, handleEngineSelectionChange } = useActions(
    RoleMappingsLogic
  );

  const {
    accessAllEngines,
    availableEngines,
    roleType,
    selectedEngines,
    selectedOptions,
  } = useValues(RoleMappingsLogic);

  const hasEngineAssignment = selectedEngines.size > 0 || accessAllEngines;

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
  );
};

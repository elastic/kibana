/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFormRow,
  EuiSuperSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { kebabCase, camelCase } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';

import { Threats, ThreatTechnique } from '@kbn/securitysolution-io-ts-alerting-types';
import { techniquesOptions } from '../../../mitre/mitre_tactics_techniques';
import * as Rulei18n from '../../../pages/detection_engine/rules/translations';
import { FieldHook } from '../../../../shared_imports';
import { MyAddItemButton } from '../add_item_form';
import { hasSubtechniqueOptions } from './helpers';
import * as i18n from './translations';
import { MitreAttackSubtechniqueFields } from './subtechnique_fields';

const TechniqueContainer = styled.div`
  ${({ theme }) => css`
    margin-left: 24px;
    padding-left: 24px;
    border-left: 2px solid ${theme.eui.euiColorLightestShade};
  `}
`;

interface AddTechniqueProps {
  field: FieldHook;
  threatIndex: number;
  idAria: string;
  isDisabled: boolean;
  onFieldChange: (threats: Threats) => void;
}

export const MitreAttackTechniqueFields: React.FC<AddTechniqueProps> = ({
  field,
  idAria,
  isDisabled,
  threatIndex,
  onFieldChange,
}): JSX.Element => {
  const values = field.value as Threats;

  const removeTechnique = useCallback(
    (index: number) => {
      const threats = [...(field.value as Threats)];
      const techniques = threats[threatIndex].technique ?? [];
      techniques.splice(index, 1);
      threats[threatIndex] = {
        ...threats[threatIndex],
        technique: techniques,
      };
      onFieldChange(threats);
    },
    [field, threatIndex, onFieldChange]
  );

  const addMitreAttackTechnique = useCallback(() => {
    const threats = [...(field.value as Threats)];
    threats[threatIndex] = {
      ...threats[threatIndex],
      technique: [
        ...(threats[threatIndex].technique ?? []),
        { id: 'none', name: 'none', reference: 'none', subtechnique: [] },
      ],
    };
    onFieldChange(threats);
  }, [field, threatIndex, onFieldChange]);

  const updateTechnique = useCallback(
    (index: number, value: string) => {
      const threats = [...(field.value as Threats)];
      const { id, reference, name } = techniquesOptions.find((t) => t.value === value) || {
        id: '',
        name: '',
        reference: '',
      };
      const technique = threats[threatIndex].technique ?? [];
      onFieldChange([
        ...threats.slice(0, threatIndex),
        {
          ...threats[threatIndex],
          technique: [
            ...technique.slice(0, index),
            {
              id,
              reference,
              name,
              subtechnique: [],
            },
            ...technique.slice(index + 1),
          ],
        },
        ...threats.slice(threatIndex + 1),
      ]);
    },
    [threatIndex, onFieldChange, field]
  );

  const getSelectTechnique = useCallback(
    (tacticName: string, index: number, disabled: boolean, technique: ThreatTechnique) => {
      const options = techniquesOptions.filter((t) => t.tactics.includes(kebabCase(tacticName)));
      return (
        <>
          <EuiSuperSelect
            id="mitreAttackTechnique"
            options={[
              ...(technique.name === 'none'
                ? [
                    {
                      inputDisplay: <>{i18n.TECHNIQUE_PLACEHOLDER}</>,
                      value: 'none',
                      disabled,
                    },
                  ]
                : []),
              ...options.map((option) => ({
                inputDisplay: <>{option.label}</>,
                value: option.value,
                disabled,
              })),
            ]}
            prepend={`${field.label} ${i18n.TECHNIQUE}`}
            aria-label=""
            onChange={updateTechnique.bind(null, index)}
            fullWidth={true}
            valueOfSelected={camelCase(technique.name)}
            data-test-subj="mitreAttackTechnique"
            disabled={disabled}
            placeholder={i18n.TECHNIQUE_PLACEHOLDER}
          />
        </>
      );
    },
    [field, updateTechnique]
  );

  const techniques = values[threatIndex].technique ?? [];

  return (
    <TechniqueContainer>
      {techniques.map((technique, index) => (
        <div key={index}>
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            describedByIds={idAria ? [`${idAria} ${i18n.TECHNIQUE}`] : undefined}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow>
                {getSelectTechnique(values[threatIndex].tactic.name, index, isDisabled, technique)}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="danger"
                  iconType="trash"
                  isDisabled={isDisabled}
                  onClick={() => removeTechnique(index)}
                  aria-label={Rulei18n.DELETE}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>

          <MitreAttackSubtechniqueFields
            field={field}
            idAria={idAria}
            isDisabled={
              isDisabled || technique.name === 'none' || hasSubtechniqueOptions(technique) === false
            }
            threatIndex={threatIndex}
            techniqueIndex={index}
            onFieldChange={onFieldChange}
          />
        </div>
      ))}
      <MyAddItemButton
        data-test-subj="addMitreAttackTechnique"
        onClick={addMitreAttackTechnique}
        isDisabled={isDisabled}
      >
        {i18n.ADD_MITRE_TECHNIQUE}
      </MyAddItemButton>
    </TechniqueContainer>
  );
};

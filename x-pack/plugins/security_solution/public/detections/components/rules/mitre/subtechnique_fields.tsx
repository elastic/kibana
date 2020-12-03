/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFormRow,
  EuiSuperSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { camelCase } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { subtechniquesOptions } from '../../../mitre/mitre_tactics_techniques';
import * as Rulei18n from '../../../pages/detection_engine/rules/translations';
import { FieldHook } from '../../../../shared_imports';
import { IMitreAttack, IMitreEnterpriseAttack } from '../../../pages/detection_engine/rules/types';
import { MyAddItemButton } from '../add_item_form';
import * as i18n from './translations';

const SubtechniqueContainer = styled.div`
  margin-left: 48px;
`;

interface AddSubtechniqueProps {
  field: FieldHook;
  threatIndex: number;
  techniqueIndex: number;
  idAria: string;
  isDisabled: boolean;
  onFieldChange: (threats: IMitreEnterpriseAttack[]) => void;
}

export const MitreAttackSubtechniqueFields: React.FC<AddSubtechniqueProps> = ({
  field,
  idAria,
  isDisabled,
  threatIndex,
  techniqueIndex,
  onFieldChange,
}): JSX.Element => {
  const values = field.value as IMitreEnterpriseAttack[];

  const technique = useMemo(() => {
    return values[threatIndex].technique[techniqueIndex];
  }, [values, threatIndex, techniqueIndex]);

  const removeSubtechnique = useCallback(
    (index: number) => {
      const threats = [...(field.value as IMitreEnterpriseAttack[])];
      const subtechniques = threats[threatIndex].technique[techniqueIndex].subtechnique;
      if (subtechniques != null) {
        subtechniques.splice(index, 1);

        threats[threatIndex].technique[techniqueIndex] = {
          ...threats[threatIndex].technique[techniqueIndex],
          subtechnique: subtechniques,
        };
        onFieldChange(threats);
      }
    },
    [field, threatIndex, onFieldChange, techniqueIndex]
  );

  const addMitreAttackSubtechnique = useCallback(() => {
    const threats = [...(field.value as IMitreEnterpriseAttack[])];

    const subtechniques = threats[threatIndex].technique[techniqueIndex].subtechnique;

    if (subtechniques != null) {
      threats[threatIndex].technique[techniqueIndex] = {
        ...threats[threatIndex].technique[techniqueIndex],
        subtechnique: [...subtechniques, { id: 'none', name: 'none', reference: 'none' }],
      };
    } else {
      threats[threatIndex].technique[techniqueIndex] = {
        ...threats[threatIndex].technique[techniqueIndex],
        subtechnique: [{ id: 'none', name: 'none', reference: 'none' }],
      };
    }

    onFieldChange(threats);
  }, [field, threatIndex, onFieldChange, techniqueIndex]);

  const updateSubtechnique = useCallback(
    (index: number, value: string) => {
      const threats = [...(field.value as IMitreEnterpriseAttack[])];
      const { id, reference, name } = subtechniquesOptions.find((t) => t.value === value) || {
        id: '',
        name: '',
        reference: '',
      };
      const subtechniques = threats[threatIndex].technique[techniqueIndex].subtechnique;

      if (subtechniques != null) {
        onFieldChange([
          ...threats.slice(0, threatIndex),
          {
            ...threats[threatIndex],
            technique: [
              ...threats[threatIndex].technique.slice(0, techniqueIndex),
              {
                ...threats[threatIndex].technique[techniqueIndex],
                subtechnique: [
                  ...subtechniques.slice(0, index),
                  {
                    id,
                    reference,
                    name,
                  },
                  ...subtechniques.slice(index + 1),
                ],
              },
              ...threats[threatIndex].technique.slice(techniqueIndex + 1),
            ],
          },
          ...threats.slice(threatIndex + 1),
        ]);
      }
    },
    [threatIndex, techniqueIndex, onFieldChange, field]
  );

  const getSelectSubtechnique = useCallback(
    (index: number, disabled: boolean, subtechnique: IMitreAttack) => {
      const options = subtechniquesOptions.filter((t) => t.techniqueId === technique.id);

      return (
        <>
          <EuiSuperSelect
            id="mitreAttackSubtechnique"
            options={[
              ...(subtechnique.name === 'none'
                ? [
                    {
                      inputDisplay: <>{i18n.SUBTECHNIQUE_PLACEHOLDER}</>,
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
            prepend={`${field.label} ${i18n.SUBTECHNIQUE}`}
            aria-label=""
            onChange={updateSubtechnique.bind(null, index)}
            fullWidth={true}
            valueOfSelected={camelCase(subtechnique.name)}
            data-test-subj="mitreAttackSubtechnique"
            disabled={disabled}
            placeholder={i18n.SUBTECHNIQUE_PLACEHOLDER}
          />
        </>
      );
    },
    [field, updateSubtechnique, technique]
  );

  return (
    <SubtechniqueContainer>
      {technique.subtechnique != null &&
        technique.subtechnique.map((subtechnique, index) => (
          <div key={index}>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              describedByIds={idAria ? [`${idAria} ${i18n.SUBTECHNIQUE}`] : undefined}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow>
                  {getSelectSubtechnique(index, isDisabled, subtechnique)}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="danger"
                    iconType="trash"
                    isDisabled={isDisabled}
                    onClick={() => removeSubtechnique(index)}
                    aria-label={Rulei18n.DELETE}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </div>
        ))}
      <MyAddItemButton
        data-test-subj="addMitreAttackSubtechnique"
        onClick={addMitreAttackSubtechnique}
        isDisabled={isDisabled}
      >
        {i18n.ADD_MITRE_SUBTECHNIQUE}
      </MyAddItemButton>
    </SubtechniqueContainer>
  );
};

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
  EuiComboBox,
  EuiText,
} from '@elastic/eui';
import { isEmpty, kebabCase, camelCase } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';

import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';
import * as Rulei18n from '../../../pages/detection_engine/rules/translations';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { threatDefault } from '../step_about_rule/default_value';
import { IMitreEnterpriseAttack } from '../../../pages/detection_engine/rules/types';
import { MyAddItemButton } from '../add_item_form';
import { isMitreAttackInvalid } from './helpers';
import * as i18n from './translations';

const MitreContainer = styled.div`
  margin-top: 16px;
`;
const MyEuiSuperSelect = styled(EuiSuperSelect)`
  width: 280px;
`;
interface AddItemProps {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

export const AddMitreThreat = ({ field, idAria, isDisabled }: AddItemProps) => {
  const [showValidation, setShowValidation] = useState(false);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const removeItem = useCallback(
    (index: number) => {
      const values = field.value as string[];
      const newValues = [...values.slice(0, index), ...values.slice(index + 1)];
      if (isEmpty(newValues)) {
        field.setValue(threatDefault);
      } else {
        field.setValue(newValues);
      }
    },
    [field]
  );

  const addItem = useCallback(() => {
    const values = field.value as IMitreEnterpriseAttack[];
    if (!isEmpty(values[values.length - 1])) {
      field.setValue([
        ...values,
        { tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] },
      ]);
    } else {
      field.setValue([{ tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] }]);
    }
  }, [field]);

  const updateTactic = useCallback(
    (index: number, value: string) => {
      const values = field.value as IMitreEnterpriseAttack[];
      const { id, reference, name } = tacticsOptions.find((t) => t.value === value) || {
        id: '',
        name: '',
        reference: '',
      };
      field.setValue([
        ...values.slice(0, index),
        {
          ...values[index],
          tactic: { id, reference, name },
          technique: [],
        },
        ...values.slice(index + 1),
      ]);
    },
    [field]
  );

  const updateTechniques = useCallback(
    (index: number, selectedOptions: unknown[]) => {
      field.setValue([
        ...values.slice(0, index),
        {
          ...values[index],
          technique: selectedOptions,
        },
        ...values.slice(index + 1),
      ]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field]
  );

  const values = field.value as IMitreEnterpriseAttack[];

  const getSelectTactic = (tacticName: string, index: number, disabled: boolean) => (
    <MyEuiSuperSelect
      id="selectDocExample"
      options={[
        ...(tacticName === 'none'
          ? [
              {
                inputDisplay: <>{i18n.TACTIC_PLACEHOLDER}</>,
                value: 'none',
                disabled,
              },
            ]
          : []),
        ...tacticsOptions.map((t) => ({
          inputDisplay: <>{t.text}</>,
          value: t.value,
          disabled,
        })),
      ]}
      aria-label=""
      onChange={updateTactic.bind(null, index)}
      fullWidth={false}
      valueOfSelected={camelCase(tacticName)}
      data-test-subj="mitreTactic"
    />
  );

  const getSelectTechniques = (item: IMitreEnterpriseAttack, index: number, disabled: boolean) => {
    const invalid = isMitreAttackInvalid(item.tactic.name, item.technique);
    const options = techniquesOptions.filter((t) =>
      t.tactics.includes(kebabCase(item.tactic.name))
    );
    const selectedOptions = item.technique.map((technic) => ({
      ...technic,
      label: `${technic.name} (${technic.id})`, // API doesn't allow for label field
    }));

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow>
          <EuiComboBox
            data-test-subj="mitreTechniques"
            placeholder={item.tactic.name === 'none' ? '' : i18n.TECHNIQUES_PLACEHOLDER}
            options={options}
            selectedOptions={selectedOptions}
            onChange={updateTechniques.bind(null, index)}
            isDisabled={disabled || item.tactic.name === 'none'}
            fullWidth={true}
            isInvalid={showValidation && invalid}
            onBlur={() => setShowValidation(true)}
          />
          {showValidation && invalid && (
            <EuiText color="danger" size="xs">
              <p>{errorMessage}</p>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            isDisabled={disabled || item.tactic.name === 'none'}
            onClick={() => removeItem(index)}
            aria-label={Rulei18n.DELETE}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MitreContainer>
      {values.map((item, index) => (
        <div key={index}>
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              {index === 0 ? (
                <EuiFormRow
                  label={`${field.label} ${i18n.TACTIC}`}
                  labelAppend={field.labelAppend}
                  describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                >
                  <>{getSelectTactic(item.tactic.name, index, isDisabled)}</>
                </EuiFormRow>
              ) : (
                getSelectTactic(item.tactic.name, index, isDisabled)
              )}
            </EuiFlexItem>
            <EuiFlexItem grow>
              {index === 0 ? (
                <EuiFormRow
                  label={`${field.label} ${i18n.TECHNIQUE}`}
                  isInvalid={showValidation && isInvalid}
                  fullWidth
                  describedByIds={idAria ? [`${idAria} ${i18n.TECHNIQUE}`] : undefined}
                >
                  <>{getSelectTechniques(item, index, isDisabled)}</>
                </EuiFormRow>
              ) : (
                getSelectTechniques(item, index, isDisabled)
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          {values.length - 1 !== index && <EuiSpacer size="s" />}
        </div>
      ))}
      <MyAddItemButton data-test-subj="addMitre" onClick={addItem} isDisabled={isDisabled}>
        {i18n.ADD_MITRE_ATTACK}
      </MyAddItemButton>
    </MitreContainer>
  );
};

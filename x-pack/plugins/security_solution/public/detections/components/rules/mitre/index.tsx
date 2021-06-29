/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFormRow, EuiSuperSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty, camelCase } from 'lodash/fp';
import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { isEqual } from 'lodash';
import { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import { tacticsOptions } from '../../../mitre/mitre_tactics_techniques';
import * as Rulei18n from '../../../pages/detection_engine/rules/translations';
import { FieldHook } from '../../../../shared_imports';
import { threatDefault } from '../step_about_rule/default_value';
import { MyAddItemButton } from '../add_item_form';
import * as i18n from './translations';
import { MitreAttackTechniqueFields } from './technique_fields';

const MitreAttackContainer = styled.div`
  margin-top: 16px;
`;

const InitialMitreAttackFormRow = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiText {
      padding-right: 32px;
    }
  }
`;

interface AddItemProps {
  field: FieldHook;
  dataTestSubj: string; // eslint-disable-line react/no-unused-prop-types
  idAria: string;
  isDisabled: boolean;
}

export const AddMitreAttackThreat = memo(({ field, idAria, isDisabled }: AddItemProps) => {
  const removeTactic = useCallback(
    (index: number) => {
      const values = [...(field.value as Threats)];
      values.splice(index, 1);
      if (isEmpty(values)) {
        field.setValue(threatDefault);
      } else {
        field.setValue(values);
      }
    },
    [field]
  );

  const addMitreAttackTactic = useCallback(() => {
    const values = [...(field.value as Threats)];
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
      const values = [...(field.value as Threats)];
      const { id, reference, name } = tacticsOptions.find((t) => t.value === value) || {
        id: '',
        name: '',
        reference: '',
      };
      values.splice(index, 1, {
        ...values[index],
        tactic: { id, reference, name },
        technique: [],
      });
      field.setValue([...values]);
    },
    [field]
  );

  const values = useMemo(() => {
    return [...(field.value as Threats)];
  }, [field]);

  const getSelectTactic = useCallback(
    (threat: Threat, index: number, disabled: boolean) => {
      const tacticName = threat.tactic.name;
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow>
            <EuiSuperSelect
              id="mitreAttackTactic"
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
              prepend={`${field.label} ${i18n.TACTIC}`}
              aria-label=""
              onChange={updateTactic.bind(null, index)}
              fullWidth={true}
              valueOfSelected={camelCase(tacticName)}
              data-test-subj="mitreAttackTactic"
              placeholder={i18n.TACTIC_PLACEHOLDER}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              isDisabled={isDisabled || isEqual(values, threatDefault)}
              onClick={() => removeTactic(index)}
              aria-label={Rulei18n.DELETE}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [field, isDisabled, removeTactic, updateTactic, values]
  );

  /**
   * Uses the fieldhook to set a new field value
   *
   * Value is memoized on top level props, any deep changes will have to be new objects
   */
  const onFieldChange = useCallback(
    (threats: Threats) => {
      field.setValue(threats);
    },
    [field]
  );

  return (
    <MitreAttackContainer>
      {values.map((threat, index) => (
        <div key={index}>
          {index === 0 ? (
            <InitialMitreAttackFormRow
              fullWidth
              label={`${field.label} ${i18n.THREATS}`}
              labelAppend={field.labelAppend}
              describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
            >
              <>{getSelectTactic(threat, index, isDisabled)}</>
            </InitialMitreAttackFormRow>
          ) : (
            <EuiFormRow
              fullWidth
              describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
            >
              {getSelectTactic(threat, index, isDisabled)}
            </EuiFormRow>
          )}

          <MitreAttackTechniqueFields
            field={field}
            threatIndex={index}
            isDisabled={isDisabled || threat.tactic.name === 'none'}
            idAria={idAria}
            onFieldChange={onFieldChange}
          />
        </div>
      ))}
      <MyAddItemButton
        data-test-subj="addMitreAttackTactic"
        onClick={addMitreAttackTactic}
        isDisabled={isDisabled}
      >
        {i18n.ADD_MITRE_TACTIC}
      </MyAddItemButton>
    </MitreAttackContainer>
  );
});

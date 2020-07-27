/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFormRow,
  EuiCheckbox,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { CommonUseField } from '../../../../cases/components/create';
import { AboutStepRiskScore } from '../../../pages/detection_engine/rules/types';
import { FieldComponent } from '../../../../common/components/autocomplete/field';
import { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';

const NestedContent = styled.div`
  margin-left: 24px;
`;

const EuiFlexItemIconColumn = styled(EuiFlexItem)`
  width: 20px;
`;

const EuiFlexItemRiskScoreColumn = styled(EuiFlexItem)`
  width: 160px;
`;

interface RiskScoreFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  indices: IIndexPattern;
  placeholder?: string;
}

export const RiskScoreField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  placeholder,
}: RiskScoreFieldProps) => {
  const [isRiskScoreMappingChecked, setIsRiskScoreMappingChecked] = useState(false);
  const [initialFieldCheck, setInitialFieldCheck] = useState(true);

  const fieldTypeFilter = useMemo(() => ['number'], []);

  useEffect(() => {
    if (
      !isRiskScoreMappingChecked &&
      initialFieldCheck &&
      (field.value as AboutStepRiskScore).mapping?.length > 0
    ) {
      setIsRiskScoreMappingChecked(true);
      setInitialFieldCheck(false);
    }
  }, [
    field,
    initialFieldCheck,
    isRiskScoreMappingChecked,
    setIsRiskScoreMappingChecked,
    setInitialFieldCheck,
  ]);

  const handleFieldChange = useCallback(
    ([newField]: IFieldType[]): void => {
      const values = field.value as AboutStepRiskScore;
      field.setValue({
        value: values.value,
        mapping: [
          {
            field: newField?.name ?? '',
            operator: 'equals',
            value: '',
          },
        ],
      });
    },
    [field]
  );

  const selectedField = useMemo(() => {
    const existingField = (field.value as AboutStepRiskScore).mapping?.[0]?.field ?? '';
    const [newSelectedField] = indices.fields.filter(
      ({ name }) => existingField != null && existingField === name
    );
    return newSelectedField;
  }, [field.value, indices]);

  const handleRiskScoreMappingChecked = useCallback(() => {
    setIsRiskScoreMappingChecked(!isRiskScoreMappingChecked);
  }, [isRiskScoreMappingChecked, setIsRiskScoreMappingChecked]);

  const riskScoreLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>{i18n.DEFAULT_RISK_SCORE}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size={'xs'}>{i18n.RISK_SCORE_DESCRIPTION}</EuiText>
      </div>
    );
  }, []);

  const riskScoreMappingLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup alignItems="center" gutterSize="s" onClick={handleRiskScoreMappingChecked}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`risk_score-mapping-override`}
              checked={isRiskScoreMappingChecked}
              onChange={handleRiskScoreMappingChecked}
            />
          </EuiFlexItem>
          <EuiFlexItem>{i18n.RISK_SCORE_MAPPING}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <NestedContent>
          <EuiText size={'xs'}>{i18n.RISK_SCORE_MAPPING_DESCRIPTION}</EuiText>
        </NestedContent>
      </div>
    );
  }, [handleRiskScoreMappingChecked, isRiskScoreMappingChecked]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          label={riskScoreLabel}
          labelAppend={field.labelAppend}
          helpText={field.helpText}
          error={'errorMessage'}
          isInvalid={false}
          fullWidth
          data-test-subj={dataTestSubj}
          describedByIds={idAria ? [idAria] : undefined}
        >
          <CommonUseField
            path="riskScore.value"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleRiskScore',
              'data-test-subj': 'detectionEngineStepAboutRuleRiskScore',
              euiFieldProps: {
                max: 100,
                min: 0,
                fullWidth: false,
                disabled: false,
                showTicks: true,
                tickInterval: 25,
              },
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={riskScoreMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            isRiskScoreMappingChecked ? (
              <NestedContent>{i18n.RISK_SCORE_MAPPING_DETAILS}</NestedContent>
            ) : (
              ''
            )
          }
          error={'errorMessage'}
          isInvalid={false}
          fullWidth
          data-test-subj={dataTestSubj}
          describedByIds={idAria ? [idAria] : undefined}
        >
          <NestedContent>
            <EuiSpacer size="s" />
            {isRiskScoreMappingChecked && (
              <EuiFlexGroup direction={'column'} gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem>
                      <EuiFormLabel>{i18n.SOURCE_FIELD}</EuiFormLabel>
                    </EuiFlexItem>
                    <EuiFlexItemIconColumn grow={false} />
                    <EuiFlexItemRiskScoreColumn grow={false}>
                      <EuiFormLabel>{i18n.DEFAULT_RISK_SCORE}</EuiFormLabel>
                    </EuiFlexItemRiskScoreColumn>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem>
                      <FieldComponent
                        placeholder={placeholder ?? ''}
                        indexPattern={indices}
                        selectedField={selectedField}
                        fieldTypeFilter={fieldTypeFilter}
                        isLoading={false}
                        isClearable={false}
                        isDisabled={false}
                        onChange={handleFieldChange}
                        data-test-subj={dataTestSubj}
                        aria-label={idAria}
                        fieldInputWidth={230}
                      />
                    </EuiFlexItem>
                    <EuiFlexItemIconColumn grow={false}>
                      <EuiIcon type={'sortRight'} />
                    </EuiFlexItemIconColumn>
                    <EuiFlexItemRiskScoreColumn grow={false}>
                      <EuiText size={'s'}>{i18n.RISK_SCORE_FIELD}</EuiText>
                    </EuiFlexItemRiskScoreColumn>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </NestedContent>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

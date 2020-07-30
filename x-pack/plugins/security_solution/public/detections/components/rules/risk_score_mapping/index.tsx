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
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import * as i18n from './translations';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { CommonUseField } from '../../../../cases/components/create';
import { AboutStepRiskScore } from '../../../pages/detection_engine/rules/types';
import { FieldComponent } from '../../../../common/components/autocomplete/field';
import { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';

const RiskScoreMappingEuiFormRow = styled(EuiFormRow)`
  width: 468px;
`;

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
  isDisabled: boolean;
  placeholder?: string;
}

export const RiskScoreField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  isDisabled,
  placeholder,
}: RiskScoreFieldProps) => {
  const fieldTypeFilter = useMemo(() => ['number'], []);

  const handleFieldChange = useCallback(
    ([newField]: IFieldType[]): void => {
      const values = field.value as AboutStepRiskScore;
      field.setValue({
        value: values.value,
        isMappingChecked: values.isMappingChecked,
        mapping: [
          {
            field: newField?.name ?? '',
            operator: 'equals',
            value: undefined,
            riskScore: undefined,
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
    const values = field.value as AboutStepRiskScore;
    field.setValue({
      value: values.value,
      mapping: [...values.mapping],
      isMappingChecked: !values.isMappingChecked,
    });
  }, [field]);

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
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          onClick={!isDisabled ? handleRiskScoreMappingChecked : noop}
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`risk_score-mapping-override`}
              checked={(field.value as AboutStepRiskScore).isMappingChecked}
              disabled={isDisabled}
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
  }, [field.value, handleRiskScoreMappingChecked, isDisabled]);

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
              isDisabled,
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
        <RiskScoreMappingEuiFormRow
          label={riskScoreMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            (field.value as AboutStepRiskScore).isMappingChecked ? (
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
            {(field.value as AboutStepRiskScore).isMappingChecked && (
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
                        isDisabled={isDisabled}
                        onChange={handleFieldChange}
                        data-test-subj={dataTestSubj}
                        aria-label={idAria}
                        fieldInputWidth={270}
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
        </RiskScoreMappingEuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

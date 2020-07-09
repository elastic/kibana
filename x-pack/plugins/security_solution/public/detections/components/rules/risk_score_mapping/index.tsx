/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFormRow,
  EuiFieldText,
  EuiCheckbox,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { CommonUseField } from '../../../../cases/components/create';
import { AboutStepRiskScore } from '../../../pages/detection_engine/rules/types';

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
  indices: string[];
}

export const RiskScoreField = ({ dataTestSubj, field, idAria, indices }: RiskScoreFieldProps) => {
  const [isRiskScoreMappingSelected, setIsRiskScoreMappingSelected] = useState(false);

  const updateRiskScoreMapping = useCallback(
    (event) => {
      const values = field.value as AboutStepRiskScore;
      field.setValue({
        value: values.value,
        mapping: [
          {
            field: event.target.value,
            operator: 'equals',
            value: '',
          },
        ],
      });
    },
    [field]
  );

  const severityLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>{i18n.RISK_SCORE}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size={'xs'}>{i18n.RISK_SCORE_DESCRIPTION}</EuiText>
      </div>
    );
  }, []);

  const severityMappingLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          onClick={() => setIsRiskScoreMappingSelected(!isRiskScoreMappingSelected)}
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`risk_score-mapping-override`}
              checked={isRiskScoreMappingSelected}
              onChange={(e) => setIsRiskScoreMappingSelected(e.target.checked)}
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
  }, [isRiskScoreMappingSelected, setIsRiskScoreMappingSelected]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          label={severityLabel}
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
          label={severityMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            isRiskScoreMappingSelected ? (
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
            {isRiskScoreMappingSelected && (
              <EuiFlexGroup direction={'column'} gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem>
                      <EuiFormLabel>{i18n.SOURCE_FIELD}</EuiFormLabel>
                    </EuiFlexItem>
                    <EuiFlexItemIconColumn grow={false} />
                    <EuiFlexItemRiskScoreColumn grow={false}>
                      <EuiFormLabel>{i18n.RISK_SCORE}</EuiFormLabel>
                    </EuiFlexItemRiskScoreColumn>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem>
                      <EuiFieldText
                        data-test-subj={'detectionEngineStepAboutRuleRiskScoreMappingValue'}
                        aria-label={'detectionEngineStepAboutRuleRiskScoreMappingValu'}
                        disabled={false}
                        onChange={updateRiskScoreMapping.bind(null)}
                        value={(field.value as AboutStepRiskScore).mapping?.[0]?.field ?? ''}
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

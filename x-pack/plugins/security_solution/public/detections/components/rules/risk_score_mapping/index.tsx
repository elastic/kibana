/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import {
  EuiFormRow,
  EuiCheckbox,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiIcon,
  EuiSpacer,
  EuiRange,
} from '@elastic/eui';

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FieldComponent } from '@kbn/securitysolution-autocomplete';
import type { RiskScoreMapping } from '@kbn/securitysolution-io-ts-alerting-types';

import type { AboutStepRiskScore } from '../../../pages/detection_engine/rules/types';
import * as i18n from './translations';

const NestedContent = styled.div`
  margin-left: 24px;
`;

const EuiFlexItemComboBoxColumn = styled(EuiFlexItem)`
  max-width: 376px;
`;

const EuiFlexItemIconColumn = styled(EuiFlexItem)`
  width: 20px;
`;

const EuiFlexItemRiskScoreColumn = styled(EuiFlexItem)`
  width: 160px;
`;

interface RiskScoreFieldProps {
  dataTestSubj: string;
  field: FieldHook<AboutStepRiskScore>;
  idAria: string;
  indices: DataViewBase;
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
  const { value, isMappingChecked, mapping } = field.value;
  const { setValue } = field;

  const fieldTypeFilter = useMemo(() => ['number'], []);
  const selectedField = useMemo(() => getFieldTypeByMapping(mapping, indices), [mapping, indices]);

  const handleDefaultRiskScoreChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>): void => {
      const range = (e.target as HTMLInputElement).value;
      setValue({
        value: Number(range.trim()),
        isMappingChecked,
        mapping,
      });
    },
    [setValue, isMappingChecked, mapping]
  );

  const handleRiskScoreMappingChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      setValue({
        value,
        isMappingChecked,
        mapping: [
          {
            field: newField?.name ?? '',
            operator: 'equals',
            value: '',
            risk_score: undefined,
          },
        ],
      });
    },
    [setValue, value, isMappingChecked]
  );

  const handleRiskScoreMappingChecked = useCallback(() => {
    setValue({
      value,
      isMappingChecked: !isMappingChecked,
      mapping: [...mapping],
    });
  }, [setValue, value, isMappingChecked, mapping]);

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
              checked={isMappingChecked}
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
  }, [isMappingChecked, handleRiskScoreMappingChecked, isDisabled]);

  return (
    <EuiFlexGroup direction={'column'}>
      <EuiFlexItem>
        <EuiFormRow
          label={riskScoreLabel}
          labelAppend={field.labelAppend}
          helpText={field.helpText}
          error={'errorMessage'}
          isInvalid={false}
          fullWidth
          data-test-subj={`${dataTestSubj}-defaultRisk`}
          describedByIds={idAria ? [idAria] : undefined}
        >
          <EuiRange
            value={value}
            onChange={handleDefaultRiskScoreChange}
            max={100}
            min={0}
            showRange
            showInput
            fullWidth={false}
            showTicks
            tickInterval={25}
            data-test-subj={`${dataTestSubj}-defaultRiskRange`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={riskScoreMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            isMappingChecked ? <NestedContent>{i18n.RISK_SCORE_MAPPING_DETAILS}</NestedContent> : ''
          }
          error={'errorMessage'}
          isInvalid={false}
          fullWidth
          data-test-subj={`${dataTestSubj}-riskOverride`}
          describedByIds={idAria ? [idAria] : undefined}
        >
          <NestedContent>
            <EuiSpacer size="s" />
            {isMappingChecked && (
              <EuiFlexGroup direction={'column'} gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItemComboBoxColumn>
                      <EuiFormLabel>{i18n.SOURCE_FIELD}</EuiFormLabel>
                    </EuiFlexItemComboBoxColumn>
                    <EuiFlexItemIconColumn grow={false} />
                    <EuiFlexItemRiskScoreColumn grow={false}>
                      <EuiFormLabel>{i18n.DEFAULT_RISK_SCORE}</EuiFormLabel>
                    </EuiFlexItemRiskScoreColumn>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItemComboBoxColumn>
                      <FieldComponent
                        placeholder={placeholder ?? ''}
                        indexPattern={indices}
                        selectedField={selectedField}
                        fieldTypeFilter={fieldTypeFilter}
                        isLoading={false}
                        isClearable={false}
                        isDisabled={isDisabled}
                        onChange={handleRiskScoreMappingChange}
                        data-test-subj={dataTestSubj}
                        aria-label={idAria}
                      />
                    </EuiFlexItemComboBoxColumn>
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

/**
 * Looks for field metadata (DataViewFieldBase) in existing index pattern.
 * If specified field doesn't exist, returns a stub DataViewFieldBase created based on the mapping --
 * because the field might not have been indexed yet, but we still need to display the mapping.
 *
 * @param mapping Mapping of a specified field name to risk score.
 * @param pattern Existing index pattern.
 */
const getFieldTypeByMapping = (
  mapping: RiskScoreMapping,
  pattern: DataViewBase
): DataViewFieldBase => {
  const field = mapping?.[0]?.field ?? '';
  const [knownFieldType] = pattern.fields.filter(({ name }) => field != null && field === name);
  return knownFieldType ?? { name: field, type: 'number' };
};

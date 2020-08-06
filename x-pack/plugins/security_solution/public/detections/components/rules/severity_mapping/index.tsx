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
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { SeverityOptionItem } from '../step_about_rule/data';
import { CommonUseField } from '../../../../cases/components/create';
import { AboutStepSeverity } from '../../../pages/detection_engine/rules/types';
import {
  IFieldType,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/common/index_patterns';
import { FieldComponent } from '../../../../common/components/autocomplete/field';
import { AutocompleteFieldMatchComponent } from '../../../../common/components/autocomplete/field_value_match';
import {
  Severity,
  SeverityMapping,
  SeverityMappingItem,
} from '../../../../../common/detection_engine/schemas/common/schemas';

const SeverityMappingEuiFormRow = styled(EuiFormRow)`
  width: 468px;
`;

const NestedContent = styled.div`
  margin-left: 24px;
`;

const EuiFlexItemIconColumn = styled(EuiFlexItem)`
  width: 20px;
`;

const EuiFlexItemSeverityColumn = styled(EuiFlexItem)`
  width: 80px;
`;

interface SeverityFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  indices: IIndexPattern;
  isDisabled: boolean;
  options: SeverityOptionItem[];
}

export const SeverityField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  isDisabled,
  options,
}: SeverityFieldProps) => {
  const fieldValueInputWidth = 160;

  const handleFieldValueChange = useCallback(
    (newMappingItems: SeverityMapping, index: number): void => {
      const values = field.value as AboutStepSeverity;
      field.setValue({
        value: values.value,
        isMappingChecked: values.isMappingChecked,
        mapping: [
          ...values.mapping.slice(0, index),
          ...newMappingItems,
          ...values.mapping.slice(index + 1),
        ],
      });
    },
    [field]
  );

  const handleFieldChange = useCallback(
    (index: number, severity: Severity, [newField]: IFieldType[]): void => {
      const values = field.value as AboutStepSeverity;
      const newMappingItems: SeverityMapping = [
        {
          ...values.mapping[index],
          field: newField?.name ?? '',
          value: newField != null ? values.mapping[index].value : '',
          operator: 'equals',
          severity,
        },
      ];
      handleFieldValueChange(newMappingItems, index);
    },
    [field, handleFieldValueChange]
  );

  const handleFieldMatchValueChange = useCallback(
    (index: number, severity: Severity, newMatchValue: string): void => {
      const values = field.value as AboutStepSeverity;
      const newMappingItems: SeverityMapping = [
        {
          ...values.mapping[index],
          field: values.mapping[index].field,
          value:
            values.mapping[index].field != null && values.mapping[index].field !== ''
              ? newMatchValue
              : '',
          operator: 'equals',
          severity,
        },
      ];
      handleFieldValueChange(newMappingItems, index);
    },
    [field, handleFieldValueChange]
  );

  const getIFieldTypeFromFieldName = (
    fieldName: string | undefined,
    iIndexPattern: IIndexPattern
  ): IFieldType | undefined => {
    const [iFieldType] = iIndexPattern.fields.filter(({ name }) => fieldName === name);
    return iFieldType;
  };

  const handleSeverityMappingChecked = useCallback(() => {
    const values = field.value as AboutStepSeverity;
    field.setValue({
      value: values.value,
      mapping: [...values.mapping],
      isMappingChecked: !values.isMappingChecked,
    });
  }, [field]);

  const severityLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>{i18n.SEVERITY}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size={'xs'}>{i18n.SEVERITY_DESCRIPTION}</EuiText>
      </div>
    );
  }, []);

  const severityMappingLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          onClick={!isDisabled ? handleSeverityMappingChecked : noop}
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`severity-mapping-override`}
              checked={(field.value as AboutStepSeverity).isMappingChecked}
              disabled={isDisabled}
              onChange={handleSeverityMappingChecked}
            />
          </EuiFlexItem>
          <EuiFlexItem>{i18n.SEVERITY_MAPPING}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <NestedContent>
          <EuiText size={'xs'}>{i18n.SEVERITY_MAPPING_DESCRIPTION}</EuiText>
        </NestedContent>
      </div>
    );
  }, [field.value, handleSeverityMappingChecked, isDisabled]);

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
            path="severity.value"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleSeverity',
              'data-test-subj': 'detectionEngineStepAboutRuleSeverity',
              isDisabled,
              euiFieldProps: {
                fullWidth: false,
                disabled: false,
                options,
              },
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <SeverityMappingEuiFormRow
          label={severityMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            (field.value as AboutStepSeverity).isMappingChecked ? (
              <NestedContent>{i18n.SEVERITY_MAPPING_DETAILS}</NestedContent>
            ) : (
              ''
            )
          }
          error={'errorMessage'}
          isInvalid={false}
          fullWidth
          data-test-subj={`${dataTestSubj}-severityOverride`}
          describedByIds={idAria ? [idAria] : undefined}
        >
          <NestedContent>
            <EuiSpacer size="s" />
            {(field.value as AboutStepSeverity).isMappingChecked && (
              <EuiFlexGroup direction={'column'} gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem>
                      <EuiFormLabel>{i18n.SOURCE_FIELD}</EuiFormLabel>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormLabel>{i18n.SOURCE_VALUE}</EuiFormLabel>
                    </EuiFlexItem>
                    <EuiFlexItemIconColumn grow={false} />
                    <EuiFlexItemSeverityColumn grow={false}>
                      <EuiFormLabel>{i18n.DEFAULT_SEVERITY}</EuiFormLabel>
                    </EuiFlexItemSeverityColumn>
                  </EuiFlexGroup>
                </EuiFlexItem>

                {(field.value as AboutStepSeverity).mapping.map(
                  (severityMappingItem: SeverityMappingItem, index) => (
                    <EuiFlexItem key={`${severityMappingItem.severity}-${index}`}>
                      <EuiFlexGroup
                        data-test-subj="severityOverrideRow"
                        alignItems="center"
                        gutterSize="s"
                      >
                        <EuiFlexItem>
                          <FieldComponent
                            placeholder={''}
                            selectedField={getIFieldTypeFromFieldName(
                              severityMappingItem.field,
                              indices
                            )}
                            isLoading={false}
                            isDisabled={isDisabled}
                            isClearable={false}
                            indexPattern={indices}
                            fieldInputWidth={fieldValueInputWidth}
                            onChange={handleFieldChange.bind(
                              null,
                              index,
                              severityMappingItem.severity
                            )}
                            data-test-subj={`detectionEngineStepAboutRuleSeverityMappingField-${severityMappingItem.severity}-${index}`}
                            aria-label={`detectionEngineStepAboutRuleSeverityMappingField-${severityMappingItem.severity}-${index}`}
                          />
                        </EuiFlexItem>

                        <EuiFlexItem>
                          <AutocompleteFieldMatchComponent
                            placeholder={''}
                            selectedField={getIFieldTypeFromFieldName(
                              severityMappingItem.field,
                              indices
                            )}
                            selectedValue={severityMappingItem.value}
                            isClearable={false}
                            isDisabled={isDisabled}
                            isLoading={false}
                            indexPattern={indices}
                            fieldInputWidth={fieldValueInputWidth}
                            onChange={handleFieldMatchValueChange.bind(
                              null,
                              index,
                              severityMappingItem.severity
                            )}
                            data-test-subj={`detectionEngineStepAboutRuleSeverityMappingValue-${severityMappingItem.severity}-${index}`}
                            aria-label={`detectionEngineStepAboutRuleSeverityMappingValue-${severityMappingItem.severity}-${index}`}
                          />
                        </EuiFlexItem>
                        <EuiFlexItemIconColumn grow={false}>
                          <EuiIcon type={'sortRight'} />
                        </EuiFlexItemIconColumn>
                        <EuiFlexItemSeverityColumn grow={false}>
                          {
                            options.find((o) => o.value === severityMappingItem.severity)
                              ?.inputDisplay
                          }
                        </EuiFlexItemSeverityColumn>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  )
                )}
              </EuiFlexGroup>
            )}
          </NestedContent>
        </SeverityMappingEuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

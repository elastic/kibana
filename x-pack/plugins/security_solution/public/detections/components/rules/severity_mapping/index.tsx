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
  EuiSuperSelect,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { SeverityOptionItem } from '../step_about_rule/data';
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
  const { setValue } = field;
  const { value, isMappingChecked, mapping } = field.value as AboutStepSeverity;

  const handleFieldValueChange = useCallback(
    (newMappingItems: SeverityMapping, index: number): void => {
      setValue({
        value,
        isMappingChecked,
        mapping: [...mapping.slice(0, index), ...newMappingItems, ...mapping.slice(index + 1)],
      });
    },
    [value, isMappingChecked, mapping, setValue]
  );

  const handleFieldChange = useCallback(
    (index: number, severity: Severity, [newField]: IFieldType[]): void => {
      const newMappingItems: SeverityMapping = [
        {
          ...mapping[index],
          field: newField?.name ?? '',
          value: newField != null ? mapping[index].value : '',
          operator: 'equals',
          severity,
        },
      ];
      handleFieldValueChange(newMappingItems, index);
    },
    [mapping, handleFieldValueChange]
  );

  const handleSecurityLevelChange = useCallback(
    (newValue: string) => {
      setValue({
        value: newValue,
        isMappingChecked,
        mapping,
      });
    },
    [isMappingChecked, mapping, setValue]
  );

  const handleFieldMatchValueChange = useCallback(
    (index: number, severity: Severity, newMatchValue: string): void => {
      const newMappingItems: SeverityMapping = [
        {
          ...mapping[index],
          field: mapping[index].field,
          value: mapping[index].field != null && mapping[index].field !== '' ? newMatchValue : '',
          operator: 'equals',
          severity,
        },
      ];
      handleFieldValueChange(newMappingItems, index);
    },
    [mapping, handleFieldValueChange]
  );

  const getIFieldTypeFromFieldName = (
    fieldName: string | undefined,
    iIndexPattern: IIndexPattern
  ): IFieldType | undefined => {
    const [iFieldType] = iIndexPattern.fields.filter(({ name }) => fieldName === name);
    return iFieldType;
  };

  const handleSeverityMappingChecked = useCallback(() => {
    setValue({
      value,
      mapping: [...mapping],
      isMappingChecked: !isMappingChecked,
    });
  }, [isMappingChecked, mapping, value, setValue]);

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
              checked={isMappingChecked}
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
  }, [handleSeverityMappingChecked, isDisabled, isMappingChecked]);

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
          data-test-subj="detectionEngineStepAboutRuleSeverity"
          describedByIds={['detectionEngineStepAboutRuleSeverity']}
        >
          <EuiSuperSelect
            fullWidth={false}
            disabled={false}
            valueOfSelected={value}
            onChange={handleSecurityLevelChange}
            options={options}
            data-test-subj="select"
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <SeverityMappingEuiFormRow
          label={severityMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            isMappingChecked ? <NestedContent>{i18n.SEVERITY_MAPPING_DETAILS}</NestedContent> : ''
          }
          error={'errorMessage'}
          isInvalid={false}
          fullWidth
          data-test-subj={`${dataTestSubj}-severityOverride`}
          describedByIds={idAria ? [idAria] : undefined}
        >
          <NestedContent>
            <EuiSpacer size="s" />
            {isMappingChecked && (
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

                {mapping.map((severityMappingItem: SeverityMappingItem, index) => (
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
                ))}
              </EuiFlexGroup>
            )}
          </NestedContent>
        </SeverityMappingEuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

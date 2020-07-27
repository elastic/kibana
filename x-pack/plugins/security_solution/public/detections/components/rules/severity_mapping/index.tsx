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
import { SeverityOptionItem } from '../step_about_rule/data';
import { CommonUseField } from '../../../../cases/components/create';
import { AboutStepSeverity } from '../../../pages/detection_engine/rules/types';
import {
  IFieldType,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/common/index_patterns';
import { FieldComponent } from '../../../../common/components/autocomplete/field';
import { AutocompleteFieldMatchComponent } from '../../../../common/components/autocomplete/field_value_match';

const SeverityMappingParentContainer = styled(EuiFlexItem)`
  max-width: 471px;
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
  options: SeverityOptionItem[];
}

export const SeverityField = ({
  dataTestSubj,
  field,
  idAria,
  indices,
  options,
}: SeverityFieldProps) => {
  const [isSeverityMappingChecked, setIsSeverityMappingChecked] = useState(false);
  const [initialFieldCheck, setInitialFieldCheck] = useState(true);
  const fieldValueInputWidth = 160;

  useEffect(() => {
    if (
      !isSeverityMappingChecked &&
      initialFieldCheck &&
      (field.value as AboutStepSeverity).mapping?.length > 0
    ) {
      setIsSeverityMappingChecked(true);
      setInitialFieldCheck(false);
    }
  }, [
    field,
    initialFieldCheck,
    isSeverityMappingChecked,
    setIsSeverityMappingChecked,
    setInitialFieldCheck,
  ]);

  const handleFieldChange = useCallback(
    (index: number, severity: string, [newField]: IFieldType[]): void => {
      const values = field.value as AboutStepSeverity;
      field.setValue({
        value: values.value,
        mapping: [
          ...values.mapping.slice(0, index),
          {
            ...values.mapping[index],
            field: newField?.name ?? '',
            operator: 'equals',
            severity,
          },
          ...values.mapping.slice(index + 1),
        ],
      });
    },
    [field]
  );

  const handleFieldMatchValueChange = useCallback(
    (index: number, severity: string, newMatchValue: string): void => {
      const values = field.value as AboutStepSeverity;
      field.setValue({
        value: values.value,
        mapping: [
          ...values.mapping.slice(0, index),
          {
            ...values.mapping[index],
            value: newMatchValue,
            operator: 'equals',
            severity,
          },
          ...values.mapping.slice(index + 1),
        ],
      });
    },
    [field]
  );

  const selectedState = useMemo(() => {
    return (
      (field.value as AboutStepSeverity).mapping?.map((mapping) => {
        const [newSelectedField] = indices.fields.filter(
          ({ name }) => mapping.field != null && mapping.field === name
        );
        return { field: newSelectedField, value: mapping.value };
      }) ?? []
    );
  }, [field.value, indices]);

  const handleSeverityMappingSelected = useCallback(() => {
    setIsSeverityMappingChecked(!isSeverityMappingChecked);
  }, [isSeverityMappingChecked, setIsSeverityMappingChecked]);

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
        <EuiFlexGroup alignItems="center" gutterSize="s" onClick={handleSeverityMappingSelected}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`severity-mapping-override`}
              checked={isSeverityMappingChecked}
              onChange={handleSeverityMappingSelected}
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
  }, [handleSeverityMappingSelected, isSeverityMappingChecked]);

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
              euiFieldProps: {
                fullWidth: false,
                disabled: false,
                options,
              },
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <SeverityMappingParentContainer>
        <EuiFormRow
          label={severityMappingLabel}
          labelAppend={field.labelAppend}
          helpText={
            isSeverityMappingChecked ? (
              <NestedContent>{i18n.SEVERITY_MAPPING_DETAILS}</NestedContent>
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
            {isSeverityMappingChecked && (
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

                {options.map((option, index) => (
                  <EuiFlexItem key={option.value}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem>
                        <FieldComponent
                          placeholder={''}
                          selectedField={selectedState[index]?.field ?? ''}
                          isLoading={false}
                          isClearable={false}
                          isDisabled={false}
                          indexPattern={indices}
                          fieldInputWidth={fieldValueInputWidth}
                          onChange={handleFieldChange.bind(null, index, option.value)}
                          data-test-subj={`detectionEngineStepAboutRuleSeverityMappingField${option.value}`}
                          aria-label={`detectionEngineStepAboutRuleSeverityMappingField${option.value}`}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <AutocompleteFieldMatchComponent
                          placeholder={''}
                          selectedField={selectedState[index]?.field ?? ''}
                          selectedValue={selectedState[index]?.value ?? ''}
                          isDisabled={false}
                          isLoading={false}
                          isClearable={false}
                          indexPattern={indices}
                          fieldInputWidth={fieldValueInputWidth}
                          onChange={handleFieldMatchValueChange.bind(null, index, option.value)}
                          data-test-subj={`detectionEngineStepAboutRuleSeverityMappingValue${option.value}`}
                          aria-label={`detectionEngineStepAboutRuleSeverityMappingValue${option.value}`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItemIconColumn grow={false}>
                        <EuiIcon type={'sortRight'} />
                      </EuiFlexItemIconColumn>
                      <EuiFlexItemSeverityColumn grow={false}>
                        {option.inputDisplay}
                      </EuiFlexItemSeverityColumn>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </NestedContent>
        </EuiFormRow>
      </SeverityMappingParentContainer>
    </EuiFlexGroup>
  );
};

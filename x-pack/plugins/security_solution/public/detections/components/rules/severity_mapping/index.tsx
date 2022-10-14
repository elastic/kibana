/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FieldComponent,
  AutocompleteFieldMatchComponent,
} from '@kbn/securitysolution-autocomplete';

import type {
  Severity,
  SeverityMapping,
  SeverityMappingItem,
} from '../../../../../common/detection_engine/rule_schema';
import type { SeverityOptionItem } from '../step_about_rule/data';
import type { AboutStepSeverity } from '../../../pages/detection_engine/rules/types';
import { useKibana } from '../../../../common/lib/kibana';
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

const EuiFlexItemSeverityColumn = styled(EuiFlexItem)`
  width: 80px;
`;

interface SeverityFieldProps {
  dataTestSubj: string;
  field: FieldHook<AboutStepSeverity>;
  idAria: string;
  indices: DataViewBase;
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
  const { services } = useKibana();
  const { value, isMappingChecked, mapping } = field.value;
  const { setValue } = field;

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
    (index: number, severity: Severity, [newField]: DataViewFieldBase[]): void => {
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

  const handleDefaultSeverityChange = useCallback(
    (newValue: Severity) => {
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
    <EuiFlexGroup direction={'column'}>
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
            onChange={handleDefaultSeverityChange}
            options={options}
            data-test-subj="select"
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
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
                    <EuiFlexItemComboBoxColumn>
                      <EuiFormLabel>{i18n.SOURCE_FIELD}</EuiFormLabel>
                    </EuiFlexItemComboBoxColumn>
                    <EuiFlexItemComboBoxColumn>
                      <EuiFormLabel>{i18n.SOURCE_VALUE}</EuiFormLabel>
                    </EuiFlexItemComboBoxColumn>
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
                      <EuiFlexItemComboBoxColumn>
                        <FieldComponent
                          placeholder={''}
                          selectedField={getFieldTypeByMapping(severityMappingItem, indices)}
                          isLoading={false}
                          isDisabled={isDisabled}
                          isClearable={false}
                          indexPattern={indices}
                          onChange={handleFieldChange.bind(
                            null,
                            index,
                            severityMappingItem.severity
                          )}
                          data-test-subj={`detectionEngineStepAboutRuleSeverityMappingField-${severityMappingItem.severity}-${index}`}
                          aria-label={`detectionEngineStepAboutRuleSeverityMappingField-${severityMappingItem.severity}-${index}`}
                        />
                      </EuiFlexItemComboBoxColumn>

                      <EuiFlexItemComboBoxColumn>
                        <AutocompleteFieldMatchComponent
                          autocompleteService={services.unifiedSearch.autocomplete}
                          placeholder={''}
                          selectedField={getFieldTypeByMapping(severityMappingItem, indices)}
                          selectedValue={severityMappingItem.value}
                          isClearable={false}
                          isDisabled={isDisabled}
                          isLoading={false}
                          indexPattern={indices}
                          onChange={handleFieldMatchValueChange.bind(
                            null,
                            index,
                            severityMappingItem.severity
                          )}
                          data-test-subj={`detectionEngineStepAboutRuleSeverityMappingValue-${severityMappingItem.severity}-${index}`}
                          aria-label={`detectionEngineStepAboutRuleSeverityMappingValue-${severityMappingItem.severity}-${index}`}
                        />
                      </EuiFlexItemComboBoxColumn>
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
 * @param mapping Mapping of a specified field name + value to a certain severity value.
 * @param pattern Existing index pattern.
 */
const getFieldTypeByMapping = (
  mapping: SeverityMappingItem,
  pattern: DataViewBase
): DataViewFieldBase => {
  const { field } = mapping;
  const [knownFieldType] = pattern.fields.filter(({ name }) => field === name);
  return knownFieldType ?? { name: field, type: 'string' };
};

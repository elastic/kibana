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
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import {
  FieldComponent,
  AutocompleteFieldMatchComponent,
} from '@kbn/securitysolution-autocomplete';
import type { Severity, SeverityMappingItem } from '@kbn/securitysolution-io-ts-alerting-types';
import { severityOptions } from '../step_about_rule/data';
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

interface SeverityOverrideProps {
  isDisabled: boolean;
  isClearable?: boolean;
  onSeverityMappingChecked: () => void;
  onFieldChange: (index: number, severity: Severity, [newField]: DataViewFieldBase[]) => void;
  onFieldMatchValueChange: (index: number, severity: Severity, newMatchValue: string) => void;
  isMappingChecked: boolean;
  dataTestSubj?: string;
  idAria?: string;
  mapping: SeverityMappingItem[];
  indices: DataViewBase;
}

export function SeverityOverride({
  isDisabled,
  isClearable = false,
  onSeverityMappingChecked,
  onFieldChange,
  onFieldMatchValueChange,
  isMappingChecked,
  dataTestSubj = 'severity',
  idAria,
  mapping,
  indices,
}: SeverityOverrideProps) {
  const { services } = useKibana();

  const severityMappingLabel = useMemo(() => {
    return (
      <div>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          onClick={!isDisabled ? onSeverityMappingChecked : noop}
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`severity-mapping-override`}
              checked={isMappingChecked}
              disabled={isDisabled}
              onChange={onSeverityMappingChecked}
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
  }, [onSeverityMappingChecked, isDisabled, isMappingChecked]);

  return (
    <EuiFormRow
      label={severityMappingLabel}
      helpText={
        isMappingChecked ? <NestedContent>{i18n.SEVERITY_MAPPING_DETAILS}</NestedContent> : ''
      }
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
                      onChange={onFieldChange.bind(null, index, severityMappingItem.severity)}
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
                      isClearable={isClearable}
                      isDisabled={isDisabled}
                      isLoading={false}
                      indexPattern={indices}
                      onChange={onFieldMatchValueChange.bind(
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
                      severityOptions.find((o) => o.value === severityMappingItem.severity)
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
  );
}

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

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
import { SeverityOptionItem } from '../step_about_rule/data';
import { CommonUseField } from '../../../../cases/components/create';
import { AboutStepSeverity } from '../../../pages/detection_engine/rules/types';

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
  indices: string[];
  options: SeverityOptionItem[];
}

export const SeverityField = ({
  dataTestSubj,
  field,
  idAria,
  indices, // TODO: To be used with autocomplete fields once https://github.com/elastic/kibana/pull/67013 is merged
  options,
}: SeverityFieldProps) => {
  const [isSeverityMappingChecked, setIsSeverityMappingChecked] = useState(false);

  const updateSeverityMapping = useCallback(
    (index: number, severity: string, mappingField: string, event) => {
      const values = field.value as AboutStepSeverity;
      field.setValue({
        value: values.value,
        mapping: [
          ...values.mapping.slice(0, index),
          {
            ...values.mapping[index],
            [mappingField]: event.target.value,
            operator: 'equals',
            severity,
          },
          ...values.mapping.slice(index + 1),
        ],
      });
    },
    [field]
  );

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
          onClick={() => setIsSeverityMappingChecked(!isSeverityMappingChecked)}
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`severity-mapping-override`}
              checked={isSeverityMappingChecked}
              onChange={(e) => setIsSeverityMappingChecked(e.target.checked)}
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
  }, [isSeverityMappingChecked, setIsSeverityMappingChecked]);

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

      <EuiFlexItem>
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
                      <EuiFormLabel>{i18n.SEVERITY}</EuiFormLabel>
                    </EuiFlexItemSeverityColumn>
                  </EuiFlexGroup>
                </EuiFlexItem>

                {options.map((option, index) => (
                  <EuiFlexItem key={option.value}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem>
                        <EuiFieldText
                          data-test-subj={`detectionEngineStepAboutRuleSeverityMappingField${option.value}`}
                          aria-label={`detectionEngineStepAboutRuleSeverityMappingField${option.value}`}
                          disabled={false}
                          onChange={updateSeverityMapping.bind(null, index, option.value, 'field')}
                          value={(field.value as AboutStepSeverity).mapping?.[index]?.field ?? ''}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <EuiFieldText
                          data-test-subj={`detectionEngineStepAboutRuleSeverityMappingValue${option.value}`}
                          aria-label={`detectionEngineStepAboutRuleSeverityMappingValue${option.value}`}
                          disabled={false}
                          onChange={updateSeverityMapping.bind(null, index, option.value, 'value')}
                          value={(field.value as AboutStepSeverity).mapping?.[index]?.value ?? ''}
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

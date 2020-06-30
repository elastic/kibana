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
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { SeverityOptionItem } from '../step_about_rule/data';
import { CommonUseField } from '../../../../cases/components/create';

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
  indices,
  options,
}: SeverityFieldProps) => {
  // const isInvalid = field.errors.length > 0 && form.isSubmitted;
  // const errorMessage = field.errors.length ? (field.errors[0].message as string) : null;
  const [isSeverityMappingChecked, setIsSeverityMappingChecked] = useState(false);
  // const [severityField, setSeverityField] = useState<string | undefined>();

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
                        <CommonUseField
                          path={`severity[${index}].mapping`}
                          componentProps={{
                            'data-test-subj': 'detectionEngineStepAboutRuleRiskScore111',
                            idAria: 'detectionEngineStepAboutRuleRiskScore111',
                            isDisabled: false,
                          }}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <EuiFieldText onChange={() => {}} />
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

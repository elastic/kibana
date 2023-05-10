/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, FormEvent, useState } from 'react';
import {
  EuiTextArea,
  EuiSwitch,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { INPUT_CONTROL } from '../../../common/constants';
import { getInputFromPolicy } from '../../common/utils';
import * as i18n from './translations';
import { ControlSettings } from '../control_settings';
import { OnChangeDeps } from '../../types';

export const PolicySettings = ({
  newPolicy,
  onChange,
}: PackagePolicyReplaceDefineStepExtensionComponentProps) => {
  const [policyHasErrors, setPolicyHasErrors] = useState(false);
  const controlInput = getInputFromPolicy(newPolicy, INPUT_CONTROL);
  const controlEnabled = !!controlInput?.enabled;
  const onToggleEnabled = useCallback(
    (e) => {
      if (controlInput) {
        controlInput.enabled = e.target.checked;

        onChange({ isValid: !policyHasErrors, updatedPolicy: { ...newPolicy } });
      }
    },
    [controlInput, onChange, policyHasErrors, newPolicy]
  );

  const onNameChange = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const name = event.currentTarget.value;

      onChange({ isValid: !policyHasErrors, updatedPolicy: { ...newPolicy, name } });
    },
    [onChange, policyHasErrors, newPolicy]
  );

  const onDescriptionChange = useCallback(
    (event: FormEvent<HTMLTextAreaElement>) => {
      const description = event.currentTarget.value;

      onChange({ isValid: !policyHasErrors, updatedPolicy: { ...newPolicy, description } });
    },
    [onChange, policyHasErrors, newPolicy]
  );

  const onPolicyChange = useCallback(
    (props: OnChangeDeps) => {
      setPolicyHasErrors(!props.isValid);
      onChange(props);
    },
    [onChange]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiForm component="form">
          <EuiFormRow label={i18n.name} fullWidth={true}>
            <EuiFieldText
              fullWidth={true}
              name="name"
              value={newPolicy.name}
              onChange={onNameChange}
              data-test-subj="cloud-defend-policy-name"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.description} fullWidth={true}>
            <EuiTextArea
              fullWidth={true}
              name="name"
              value={newPolicy.description}
              onChange={onDescriptionChange}
              data-test-subj="cloud-defend-policy-description"
              compressed
            />
          </EuiFormRow>
          <EuiHorizontalRule />
          <EuiFormRow fullWidth>
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj="cloud-defend-controltoggle"
                label={i18n.enableControl}
                checked={controlEnabled}
                onChange={onToggleEnabled}
              />
              <EuiSpacer size="s" />
              <EuiText color="subdued" size="s">
                {i18n.enableControlHelp}
              </EuiText>
            </EuiFlexItem>
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
      {controlEnabled && (
        <ControlSettings
          data-test-subj="cloud-defend-controlsettings"
          policy={newPolicy}
          onChange={onPolicyChange}
        />
      )}
    </EuiFlexGroup>
  );
};

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
import { INPUT_CONTROL } from '../../../common/constants';
import { getInputFromPolicy } from '../../../common/utils/helpers';
import * as i18n from './translations';
import { ControlSettings } from '../control_settings';
import { SettingsDeps, OnChangeDeps } from '../../types';

export const PolicySettings = ({ policy, onChange }: SettingsDeps) => {
  const [policyHasErrors, setPolicyHasErrors] = useState(false);
  const controlInput = getInputFromPolicy(policy, INPUT_CONTROL);
  const controlEnabled = !!controlInput?.enabled;
  const onToggleEnabled = useCallback(
    (e) => {
      if (controlInput) {
        controlInput.enabled = e.target.checked;

        onChange({ isValid: !policyHasErrors, updatedPolicy: { ...policy } });
      }
    },
    [controlInput, onChange, policyHasErrors, policy]
  );

  const onNameChange = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const name = event.currentTarget.value;

      onChange({ isValid: !policyHasErrors, updatedPolicy: { ...policy, name } });
    },
    [onChange, policyHasErrors, policy]
  );

  const onDescriptionChange = useCallback(
    (event: FormEvent<HTMLTextAreaElement>) => {
      const description = event.currentTarget.value;

      onChange({ isValid: !policyHasErrors, updatedPolicy: { ...policy, description } });
    },
    [onChange, policyHasErrors, policy]
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
              value={policy.name}
              onChange={onNameChange}
              data-test-subj="cloud-defend-policy-name"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.description} fullWidth={true}>
            <EuiTextArea
              fullWidth={true}
              name="name"
              value={policy.description}
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
          policy={policy}
          onChange={onPolicyChange}
        />
      )}
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiSwitch, EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { INPUT_CONTROL } from '../../../common/constants';
import { getInputFromPolicy } from '../../common/utils';
import * as i18n from './translations';
import { ControlSettings } from '../control_settings';
import type { SettingsDeps } from '../../types';

export const PolicySettings = ({ policy, onChange }: SettingsDeps) => {
  const controlInput = getInputFromPolicy(policy, INPUT_CONTROL);
  const controlEnabled = !!controlInput?.enabled;

  const onToggleEnabled = useCallback(
    (e) => {
      if (controlInput) {
        controlInput.enabled = e.target.checked;

        onChange({ isValid: true, updatedPolicy: policy });
      }
    },
    [controlInput, onChange, policy]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          data-test-subj="cloud-defend-control-toggle"
          label={i18n.enableControl}
          checked={controlEnabled}
          onChange={onToggleEnabled}
        />
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {i18n.enableControlHelp}
        </EuiText>
      </EuiFlexItem>
      {controlEnabled && <ControlSettings policy={policy} onChange={onChange} />}
    </EuiFlexGroup>
  );
};

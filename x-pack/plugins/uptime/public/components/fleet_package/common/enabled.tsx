/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { ConfigKey, CommonFields } from '../types';

interface Props {
  fields: CommonFields;
  onChange: ({ value, configKey }: { value: boolean; configKey: ConfigKey }) => void;
  onBlur?: () => void;
}

export function Enabled({ fields, onChange, onBlur }: Props) {
  return (
    <>
      <EuiFormRow
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.enabled.helpText"
            defaultMessage="Switch this configuration off to disable the monitor."
          />
        }
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.enabled.label"
              defaultMessage="Enabled"
            />
          }
          data-test-subj="syntheticsEnabled"
          checked={fields[ConfigKey.ENABLED]}
          onChange={(event) =>
            onChange({
              value: event.target.checked,
              configKey: ConfigKey.ENABLED,
            })
          }
          onBlur={() => onBlur?.()}
        />
      </EuiFormRow>
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { ConfigKeys, ICommonFields } from '../types';

interface Props {
  fields: ICommonFields;
  onChange: ({ value, configKey }: { value: boolean; configKey: ConfigKeys }) => void;
}

export function Enabled({ fields, onChange }: Props) {
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
          checked={fields[ConfigKeys.ENABLED]}
          onChange={(event) =>
            onChange({
              value: event.target.checked,
              configKey: ConfigKeys.ENABLED,
            })
          }
        />
      </EuiFormRow>
    </>
  );
}

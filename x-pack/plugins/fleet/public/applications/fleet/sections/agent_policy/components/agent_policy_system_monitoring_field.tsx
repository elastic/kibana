/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiCheckbox } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
}

export const AgentPolicyFormSystemMonitoringCheckbox: React.FunctionComponent<Props> = ({
  withSysMonitoring,
  updateSysMonitoring,
}) => {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.fleet.agentPolicyForm.systemMonitoringFieldLabel"
          defaultMessage="System monitoring"
        />
      }
    >
      <EuiCheckbox
        id="agentPolicyFormSystemMonitoringCheckbox"
        label={
          <>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.systemMonitoringText"
              defaultMessage="Collect system logs and metrics"
            />{' '}
            <EuiIconTip
              content={i18n.translate('xpack.fleet.agentPolicyForm.systemMonitoringTooltipText', {
                defaultMessage:
                  'Enable this option to bootstrap your policy with an integration that collects system logs and metrics.',
              })}
              position="right"
              type="iInCircle"
              color="subdued"
            />
          </>
        }
        checked={withSysMonitoring}
        onChange={() => {
          updateSysMonitoring(!withSysMonitoring);
        }}
      />
    </EuiFormRow>
  );
};

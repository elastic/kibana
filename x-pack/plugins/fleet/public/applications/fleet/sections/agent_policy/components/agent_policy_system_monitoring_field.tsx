/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiCheckbox } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AgentPolicyPackageBadge } from '../../../components';

interface Props {
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
}

export const AgentPolicyFormSystemMonitoringCheckbox: React.FunctionComponent<Props> = ({
  withSysMonitoring,
  updateSysMonitoring,
}) => {
  return (
    <EuiFormRow>
      <EuiCheckbox
        id="agentPolicyFormSystemMonitoringCheckbox"
        label={
          <>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.systemMonitoringText"
              defaultMessage="Collect system logs and metrics"
            />{' '}
            <EuiIconTip
              content={
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.systemMonitoringTooltipText"
                  defaultMessage="This will also add a {system} integration to collect system logs and metrics."
                  values={{
                    system: <AgentPolicyPackageBadge pkgName={'system'} pkgTitle={'System'} />,
                  }}
                />
              }
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
        data-test-subj="agentPolicyFormSystemMonitoringCheckbox"
      />
    </EuiFormRow>
  );
};

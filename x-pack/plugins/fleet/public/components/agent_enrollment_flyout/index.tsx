/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useGetSettings, useUrlModal } from '../../hooks';

import { ManagedInstructions } from './managed_instructions';
import { StandaloneInstructions } from './standalone_instructions';
import { MissingFleetServerHostCallout } from './missing_fleet_server_host_callout';
import type { BaseProps } from './types';

export interface Props extends BaseProps {
  onClose: () => void;
}

export * from './agent_policy_selection';
export * from './managed_instructions';
export * from './standalone_instructions';
export * from './steps';

export const AgentEnrollmentFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agentPolicy,
  agentPolicies,
}) => {
  const [mode, setMode] = useState<'managed' | 'standalone'>('managed');

  const { modal } = useUrlModal();
  const [lastModal, setLastModal] = useState(modal);
  const settings = useGetSettings();
  const fleetServerHosts = settings.data?.item?.fleet_server_hosts || [];

  // Refresh settings when there is a modal/flyout change
  useEffect(() => {
    if (modal !== lastModal) {
      settings.resendRequest();
      setLastModal(modal);
    }
  }, [modal, lastModal, settings]);

  return (
    <EuiFlyout data-test-subj="agentEnrollmentFlyout" onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentEnrollmentFlyoutTitle">
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.flyoutTitle"
              defaultMessage="Add agent"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.agentDescription"
            defaultMessage="Add Elastic Agents to your hosts to collect data and send it to the Elastic Stack."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiTabs style={{ marginBottom: '-25px' }}>
          <EuiTab
            data-test-subj="managedTab"
            isSelected={mode === 'managed'}
            onClick={() => setMode('managed')}
          >
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.enrollFleetTabLabel"
              defaultMessage="Enroll in Fleet"
            />
          </EuiTab>
          <EuiTab
            data-test-subj="standaloneTab"
            isSelected={mode === 'standalone'}
            onClick={() => setMode('standalone')}
          >
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.enrollStandaloneTabLabel"
              defaultMessage="Run standalone"
            />
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        banner={
          fleetServerHosts.length === 0 && mode === 'managed' ? (
            <MissingFleetServerHostCallout />
          ) : undefined
        }
      >
        {fleetServerHosts.length === 0 && mode === 'managed' ? null : mode === 'managed' ? (
          <ManagedInstructions agentPolicy={agentPolicy} agentPolicies={agentPolicies} />
        ) : (
          <StandaloneInstructions agentPolicy={agentPolicy} agentPolicies={agentPolicies} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.closeFlyoutButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

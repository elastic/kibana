/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentPolicy } from '../../../../types';
import { ManagedInstructions } from './managed_instructions';
import { StandaloneInstructions } from './standalone_instructions';

interface Props {
  onClose: () => void;
  agentPolicies?: AgentPolicy[];
}

export const AgentEnrollmentFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agentPolicies,
}) => {
  const [mode, setMode] = useState<'managed' | 'standalone'>('managed');

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={880}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentEnrollmentFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.flyoutTitle"
              defaultMessage="Add agent"
            />
          </h2>
        </EuiTitle>
        <EuiTabs style={{ marginBottom: '-25px' }}>
          <EuiTab isSelected={mode === 'managed'} onClick={() => setMode('managed')}>
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.enrollFleetTabLabel"
              defaultMessage="Enroll in Fleet"
            />
          </EuiTab>
          <EuiTab isSelected={mode === 'standalone'} onClick={() => setMode('standalone')}>
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.enrollStandaloneTabLabel"
              defaultMessage="Run standalone"
            />
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {mode === 'managed' ? (
          <ManagedInstructions agentPolicies={agentPolicies} />
        ) : (
          <StandaloneInstructions agentPolicies={agentPolicies} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.agentEnrollment.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose}>
              <FormattedMessage
                id="xpack.ingestManager.agentEnrollment.continueButtonLabel"
                defaultMessage="Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

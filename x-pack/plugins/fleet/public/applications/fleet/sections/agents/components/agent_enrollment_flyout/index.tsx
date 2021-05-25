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
  EuiButton,
  EuiFlyoutFooter,
  EuiTab,
  EuiTabs,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { useGetSettings, useUrlModal } from '../../../../hooks';
import type { AgentPolicy } from '../../../../types';

import { ManagedInstructions } from './managed_instructions';
import { StandaloneInstructions } from './standalone_instructions';

interface Props {
  onClose: () => void;
  agentPolicies?: AgentPolicy[];
}

const MissingFleetServerHostCallout: React.FunctionComponent = () => {
  const { setModal } = useUrlModal();
  return (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.agentEnrollment.missingFleetHostCalloutTitle', {
        defaultMessage: 'Missing URL for Fleet Server host',
      })}
    >
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.missingFleetHostCalloutText"
        defaultMessage="A URL for your Fleet Server host is required to enroll agents with Fleet. You can add this information in Fleet Settings. For more information, see the {link}."
        values={{
          link: (
            <EuiLink
              href="https://www.elastic.co/guide/en/fleet/current/index.html"
              target="_blank"
              external
            >
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.missingFleetHostGuideLink"
                defaultMessage="Fleet User Guide"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="m" />
      <EuiButton
        fill
        iconType="gear"
        onClick={() => {
          setModal('settings');
        }}
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.fleetSettingsLink"
          defaultMessage="Fleet Settings"
        />
      </EuiButton>
    </EuiCallOut>
  );
};

export const AgentEnrollmentFlyout: React.FunctionComponent<Props> = ({
  onClose,
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
    <EuiFlyout onClose={onClose} size="m">
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
          <EuiTab isSelected={mode === 'managed'} onClick={() => setMode('managed')}>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.enrollFleetTabLabel"
              defaultMessage="Enroll in Fleet"
            />
          </EuiTab>
          <EuiTab isSelected={mode === 'standalone'} onClick={() => setMode('standalone')}>
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
                id="xpack.fleet.agentEnrollment.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.continueButtonLabel"
                defaultMessage="Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

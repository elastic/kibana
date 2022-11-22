/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiButton, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useFleetStatus, useFlyoutContext } from '../../../hooks';

export function getConfirmFleetServerConnectionStep({
  disabled,
  hasRecentlyEnrolledFleetServers,
}: {
  disabled: boolean;
  hasRecentlyEnrolledFleetServers: boolean;
}): EuiStepProps {
  return {
    title: hasRecentlyEnrolledFleetServers
      ? i18n.translate('xpack.fleet.fleetServerFlyout.confirmConnectionSuccessTitle', {
          defaultMessage: 'Fleet Server connected',
        })
      : i18n.translate('xpack.fleet.fleetServerFlyout.confirmConnectionTitle', {
          defaultMessage: 'Confirm connection',
        }),
    status: hasRecentlyEnrolledFleetServers ? 'complete' : 'disabled',
    children: !disabled && (
      <ConfirmFleetServerConnectionStepContent
        hasRecentlyEnrolledFleetServers={hasRecentlyEnrolledFleetServers}
      />
    ),
  };
}

const ConfirmFleetServerConnectionStepContent: React.FunctionComponent<{
  hasRecentlyEnrolledFleetServers: boolean;
}> = ({ hasRecentlyEnrolledFleetServers }) => {
  const flyoutContext = useFlyoutContext();
  const fleetStatus = useFleetStatus();

  const handleContinueClick = () => {
    fleetStatus.forceDisplayInstructions = false;
    flyoutContext.closeFleetServerFlyout();
    flyoutContext.openEnrollmentFlyout();
  };

  return hasRecentlyEnrolledFleetServers ? (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.connectionSuccessful"
          defaultMessage="You can now continue enrolling agents with Fleet."
        />
      </EuiText>

      <EuiSpacer size="m" />

      <EuiButton
        color="primary"
        onClick={handleContinueClick}
        data-test-subj="fleetServerFlyoutContinueEnrollingButton"
      >
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.continueEnrollingButton"
          defaultMessage="Continue enrolling Elastic Agent"
        />
      </EuiButton>
    </>
  ) : (
    <EuiLoadingSpinner size="m" />
  );
};

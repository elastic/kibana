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

import type { QuickStartCreateForm } from '../../../hooks';

export function getConfirmFleetServerConnectionStep({
  quickStartCreateForm,
  isFleetServerReady,
}: {
  quickStartCreateForm: QuickStartCreateForm;
  isFleetServerReady: boolean;
}): EuiStepProps {
  return {
    title:
      quickStartCreateForm.status === 'success' && isFleetServerReady
        ? i18n.translate('xpack.fleet.fleetServerFlyout.confirmConnectionSuccessTitle', {
            defaultMessage: 'Fleet Server connected',
          })
        : i18n.translate('xpack.fleet.fleetServerFlyout.confirmConnectionTitle', {
            defaultMessage: 'Confirm connection',
          }),
    status:
      quickStartCreateForm.status === 'success' && isFleetServerReady ? 'complete' : 'disabled',
    children: (
      <ConfirmFleetServerConnectionStepContent
        quickStartCreateForm={quickStartCreateForm}
        isFleetServerReady={isFleetServerReady}
      />
    ),
  };
}

const ConfirmFleetServerConnectionStepContent: React.FunctionComponent<{
  quickStartCreateForm: QuickStartCreateForm;
  isFleetServerReady: boolean;
}> = ({ quickStartCreateForm, isFleetServerReady }) => {
  if (quickStartCreateForm.status !== 'success') {
    return null;
  }

  return isFleetServerReady ? (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.connectionSuccessful"
          defaultMessage="You can now continue enrolling agents with Fleet."
        />
      </EuiText>

      <EuiSpacer size="m" />

      <EuiButton color="primary">
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { AgentEnrollmentFlyoutFinalStepExtension } from '../../../../fleet/public';

export function getApmEnrollmentFlyoutStepProps(): AgentEnrollmentFlyoutFinalStepExtension['stepProps'] {
  // TODO: Figure out how to get `http.basePath` here
  const installApmAgentLink = '/app/home#/tutorial/apm';

  return {
    title: i18n.translate(
      'xpack.apm.fleetIntegration.enrollmentFlyout.installApmAgentTitle',
      {
        defaultMessage: 'Install APM Agent',
      }
    ),
    children: (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.apm.fleetIntegration.enrollmentFlyout.installApmAgentInstructions"
              defaultMessage="
              After the agent starts, you can install APM agents on your hosts to collect data from your applications and services."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiButton fill href={installApmAgentLink}>
          <FormattedMessage
            id="xpack.apm.fleetIntegration.enrollmentFlyout.installApmAgentButtonText"
            defaultMessage="Install APM Agent"
          />
        </EuiButton>
      </>
    ),
  };
}

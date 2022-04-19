/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AgentEnrollmentFlyoutFinalStepExtension } from '@kbn/fleet-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../plugin';

function StepComponent() {
  const { http } = useKibana<ApmPluginStartDeps>().services;
  const installApmAgentLink = http?.basePath.prepend('/app/home#/tutorial/apm');

  return (
    <>
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.apm.fleetIntegration.enrollmentFlyout.installApmAgentDescription',
            {
              defaultMessage:
                'After the agent starts, you can install APM agents on your hosts to collect data from your applications and services.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiButton fill href={installApmAgentLink}>
        {i18n.translate(
          'xpack.apm.fleetIntegration.enrollmentFlyout.installApmAgentButtonText',
          { defaultMessage: 'Install APM Agent' }
        )}
      </EuiButton>
    </>
  );
}

export function getApmEnrollmentFlyoutData(): Pick<
  AgentEnrollmentFlyoutFinalStepExtension,
  'title' | 'Component'
> {
  return {
    title: i18n.translate(
      'xpack.apm.fleetIntegration.enrollmentFlyout.installApmAgentTitle',
      {
        defaultMessage: 'Install APM Agent',
      }
    ),
    Component: StepComponent,
  };
}

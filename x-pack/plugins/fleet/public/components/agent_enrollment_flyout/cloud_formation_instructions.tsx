/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useGetSettings, useKibanaVersion, useStartServices } from '../../hooks';

interface Props {
  enrollmentAPIKey?: string;
  cloudFormationTemplateUrl: string;
}

const createCloudFormationUrl = (
  templateURL: string,
  enrollmentToken: string,
  fleetUrl: string,
  kibanaVersion: string
) => {
  const cloudFormationUrl = templateURL
    .replace('FLEET_ENROLLMENT_TOKEN', enrollmentToken)
    .replace('FLEET_URL', fleetUrl)
    .replace('KIBANA_VERSION', kibanaVersion);

  return new URL(cloudFormationUrl).toString();
};

export const CloudFormationInstructions: React.FunctionComponent<Props> = ({
  enrollmentAPIKey,
  cloudFormationTemplateUrl,
}) => {
  const [fleetServer, setFleetServer] = useState<string | ''>();
  const [isError, setIsError] = useState<boolean>(false);

  const core = useStartServices();
  const { data, isLoading } = useGetSettings();
  const { notifications } = core;

  const kibanaVersion = useKibanaVersion();

  // Sets Fleet Server Host as the first fleet server host available from the settings
  // Shows an error if no fleet server host is available
  useEffect(() => {
    if (isLoading) return;

    const fleetServerHosts = data?.item.fleet_server_hosts;
    if (fleetServerHosts !== undefined && fleetServerHosts.length !== 0) {
      setFleetServer(fleetServerHosts[0]);
    } else {
      setIsError(true);
      notifications.toasts.addError(new Error('Fleet server host not found'), {
        title: i18n.translate(
          'xpack.fleet.agentEnrollment.cloudFormation.errorLoadingFleetServerHosts',
          {
            defaultMessage: 'Error while fetching Fleet Server hosts',
          }
        ),
      });
    }
  }, [data?.item.fleet_server_hosts, isLoading, notifications.toasts]);

  const cloudFormationUrl =
    enrollmentAPIKey && fleetServer
      ? createCloudFormationUrl(
          cloudFormationTemplateUrl,
          enrollmentAPIKey,
          fleetServer,
          kibanaVersion
        )
      : '';

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.callout', {
          defaultMessage:
            'Sign in to your AWS cloud provider account, and switch to the region that you want to scan, then click Launch CloudFormation.',
        })}
        color="warning"
        iconType="warning"
      />
      <EuiSpacer size="m" />
      <EuiButton
        isLoading={isLoading}
        isDisabled={isError || cloudFormationUrl === ''}
        color="primary"
        fill
        target="_blank"
        iconSide="right"
        iconType="popout"
        href={cloudFormationUrl}
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.cloudFormation.launchButton"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
    </>
  );
};

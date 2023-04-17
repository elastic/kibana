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
  cloudFormation: string;
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
  cloudFormation,
}) => {
  const [fleetServer, setFleetServer] = useState<string | ''>();
  const [isError, setIsError] = useState<boolean>(false);

  const core = useStartServices();
  const settings = useGetSettings();
  const { notifications } = core;

  const kibanaVersion = useKibanaVersion();

  // Fetch the first fleet server host from the settings
  useEffect(() => {
    async function fetchAgentManifest() {
      try {
        const fleetServerHosts = await settings.data?.item.fleet_server_hosts;
        if (fleetServerHosts !== undefined && fleetServerHosts.length !== 0) {
          setFleetServer(fleetServerHosts[0]);
        }
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.agentEnrollment.cloudFormation.errorLoadingAgentManifest',
            {
              defaultMessage: 'Error while fetching agent manifest',
            }
          ),
        });
        setIsError(true);
      }
    }
    fetchAgentManifest();
  }, [notifications.toasts, enrollmentAPIKey, settings.data?.item.fleet_server_hosts]);

  const cloudFormationUrl =
    enrollmentAPIKey && fleetServer
      ? createCloudFormationUrl(cloudFormation, enrollmentAPIKey, fleetServer, kibanaVersion)
      : '';

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.callout', {
          defaultMessage:
            'Sign in to your cloud provider account, and switch to the region that you want to scan, then click Launch CloudFormation template.',
        })}
        color="warning"
        iconType="warning"
      />
      <EuiSpacer size="m" />
      <EuiButton
        isLoading={settings.isLoading}
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

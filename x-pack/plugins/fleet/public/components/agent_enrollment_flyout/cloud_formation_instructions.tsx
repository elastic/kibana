/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useGetSettings, useKibanaVersion } from '../../hooks';

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
  const { data, isLoading } = useGetSettings();

  const kibanaVersion = useKibanaVersion();

  // Default fleet server host
  const fleetServerHost = data?.item.fleet_server_hosts?.[0];

  if (!isLoading && !fleetServerHost) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noFleetServer', {
            defaultMessage: 'Fleet Server host not found',
          })}
          color="danger"
          iconType="error"
        />
      </>
    );
  }

  if (!enrollmentAPIKey) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noApiKey', {
            defaultMessage: 'Enrollment token not found',
          })}
          color="danger"
          iconType="error"
        />
      </>
    );
  }

  const cloudFormationUrl = createCloudFormationUrl(
    cloudFormationTemplateUrl,
    enrollmentAPIKey,
    fleetServerHost || '',
    kibanaVersion
  );

  return (
    <EuiSkeletonText
      lines={3}
      size="m"
      isLoading={isLoading}
      contentAriaLabel={i18n.translate(
        'xpack.fleet.agentEnrollment.cloudFormation.loadingAriaLabel',
        {
          defaultMessage: 'Loading CloudFormation instructions',
        }
      )}
    >
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
    </EuiSkeletonText>
  );
};

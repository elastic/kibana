/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';

import { useStartServices } from '../../../../hooks';

export interface FleetServerCloudUnhealthyCalloutProps {
  deploymentUrl: string;
}

export const FleetServerCloudUnhealthyCallout: React.FunctionComponent<
  FleetServerCloudUnhealthyCalloutProps
> = ({ deploymentUrl }) => {
  const { docLinks } = useStartServices();
  return (
    <EuiCallOut
      iconType="alert"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.fleet.fleetServerCloudUnhealthyCallout.calloutTitle"
          defaultMessage="Fleet Server is not Healthy"
        />
      }
    >
      <FormattedMessage
        id="xpack.fleet.fleetServerCloudRequiredCallout.calloutDescription"
        defaultMessage="A healthy Fleet server is required to enroll agents with Fleet. Enable Fleet Server in your {cloudDeploymentLink}. For more information see the {guideLink}."
        values={{
          cloudDeploymentLink: (
            <EuiLink href={deploymentUrl} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.fleetServerCloudRequiredCallout.cloudDeploymentLink"
                defaultMessage="cloud deployment"
              />
            </EuiLink>
          ),
          guideLink: (
            <EuiLink href={docLinks.links.fleet.fleetServerAddFleetServer} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.fleetServerCloudRequiredCallout.guideLink"
                defaultMessage="Fleet and Elastic Agent Guide"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="m" />
      <EuiButton href={deploymentUrl} target="_blank" color="warning" fill>
        <FormattedMessage
          id="xpack.fleet.fleetServerCloudRequiredCallout.editDeploymentButtonLabel"
          defaultMessage="Edit deployment"
        />
      </EuiButton>
    </EuiCallOut>
  );
};

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

export interface FleetServerOnPremUnhealthyCalloutProps {
  onClickAddFleetServer: () => void;
}
export const FleetServerOnPremUnhealthyCallout: React.FunctionComponent<
  FleetServerOnPremUnhealthyCalloutProps
> = ({ onClickAddFleetServer }) => {
  const { docLinks } = useStartServices();
  return (
    <EuiCallOut
      iconType="alert"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.fleet.fleetServerOnPremUnhealthyCallout.calloutTitle"
          defaultMessage="Fleet Server is not Healthy"
        />
      }
    >
      <FormattedMessage
        id="xpack.fleet.fleetServerOnPremUnhealthyCallout.calloutDescription"
        defaultMessage="A healthy Fleet server is required before you can enroll agents with Fleet.  For more information see the {guideLink}."
        values={{
          guideLink: (
            <EuiLink href={docLinks.links.fleet.fleetServerAddFleetServer} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.fleetServerOnPremUnhealthyCallout.guideLink"
                defaultMessage="Fleet and Elastic Agent Guide"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="m" />
      <EuiButton
        onClick={onClickAddFleetServer}
        color="warning"
        fill
        data-test-subj="addFleetServerBtn"
      >
        <FormattedMessage
          id="xpack.fleet.fleetServerOnPremUnhealthyCallout.addFleetServerButtonLabel"
          defaultMessage="Add Fleet Server"
        />
      </EuiButton>
    </EuiCallOut>
  );
};

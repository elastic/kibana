/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { useStartServices } from '../../../../hooks';

export const FleetServerOnPremRequiredCallout = () => {
  const { docLinks } = useStartServices();
  return (
    <EuiCallOut
      iconType="alert"
      title={
        <FormattedMessage
          id="xpack.fleet.fleetServerOnPremRequiredCallout.calloutTitle"
          defaultMessage="A Fleet Server is required before enrolling agents with Fleet."
        />
      }
    >
      <FormattedMessage
        id="xpack.fleet.fleetServerOnPremRequiredCallout.calloutDescription"
        defaultMessage="Follow the instructions below to set up a Fleet Server. For more information, see the {guideLink}."
        values={{
          guideLink: (
            <EuiLink href={docLinks.links.fleet.fleetServerAddFleetServer} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.fleetServerOnPremRequiredCallout.guideLink"
                defaultMessage="Fleet and Elastic Agent Guide"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};

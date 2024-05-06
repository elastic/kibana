/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LinkAnchor } from '@kbn/security-solution-navigation/links';
import { css } from '@emotion/react';
import { ExternalPageName } from '../../navigation/links/constants';

const linkAnchorCss = css`
  text-decoration: underline;
`;

export const DashboardsLandingCalloutComponent: React.FC = () => {
  return (
    <EuiCallOut
      size="s"
      iconType="visArea"
      title={
        <>
          <FormattedMessage
            id="xpack.securitySolutionServerless.dashboardsLandingCallout.title"
            defaultMessage="Building a dashboard or visualization? Create and add {maps} or choose from the {visualizationLibrary}"
            values={{
              maps: (
                <LinkAnchor id={ExternalPageName.maps} css={linkAnchorCss}>
                  <FormattedMessage
                    id="xpack.securitySolutionServerless.dashboardsLandingCallout.maps"
                    defaultMessage="Maps"
                  />
                </LinkAnchor>
              ),
              visualizationLibrary: (
                <LinkAnchor id={ExternalPageName.visualize} css={linkAnchorCss}>
                  <FormattedMessage
                    id="xpack.securitySolutionServerless.dashboardsLandingCallout.visualizeLibrary"
                    defaultMessage="Visualize library"
                  />
                </LinkAnchor>
              ),
            }}
          />
        </>
      }
    />
  );
};

DashboardsLandingCalloutComponent.displayName = 'DashboardsLandingCalloutComponent';
export const DashboardsLandingCallout = React.memo(DashboardsLandingCalloutComponent);

// eslint-disable-next-line import/no-default-export
export default DashboardsLandingCallout;

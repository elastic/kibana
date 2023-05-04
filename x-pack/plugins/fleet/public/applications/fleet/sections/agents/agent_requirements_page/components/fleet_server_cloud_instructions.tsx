/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiLink,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useFleetStatus, useStartServices } from '../../../../hooks';

const REFRESH_INTERVAL = 10000;

export const CloudInstructions: React.FC<{ deploymentUrl: string }> = ({ deploymentUrl }) => {
  const { docLinks } = useStartServices();

  const { refresh } = useFleetStatus();

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <>
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.cloudSetupTitle"
              defaultMessage="Enable Fleet Server"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.cloudSetupText"
            defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. The easiest way to get one is by adding an Integration Server, which runs the Fleet Server integration. You can add it to your deployment in the Cloud Console. For more information see the {link}"
            values={{
              link: (
                <EuiLink
                  href={docLinks.links.fleet.fleetServerAddFleetServer}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.fleet.settings.userGuideLink"
                    defaultMessage="Fleet and Elastic Agent Guide"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        actions={
          <>
            <EuiButton
              iconSide="right"
              iconType="popout"
              fill
              isLoading={false}
              type="submit"
              href={`${deploymentUrl}/edit`}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.cloudDeploymentLink"
                defaultMessage="Edit deployment"
              />
            </EuiButton>
          </>
        }
      />
      <EuiSpacer size="m" />
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.waitingText"
                defaultMessage="Waiting for a Fleet Server to connect..."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};

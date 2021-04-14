/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiEmptyPrompt,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

import { useStartServices } from '../../../hooks';

export const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
`;

function renderOnPremInstructions() {
  return (
    <EuiPanel
      grow={false}
      hasShadow={false}
      hasBorder={true}
      className="eui-textCenter"
      paddingSize="l"
    >
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.setupTitle"
              defaultMessage="Add a Fleet Server"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.setupText"
            defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. See the Fleet User Guide for instructions on how to add a Fleet Server."
          />
        }
        actions={
          <EuiButton
            iconSide="right"
            iconType="popout"
            fill
            isLoading={false}
            type="submit"
            href="https://ela.st/add-fleet-server"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.setupGuideLink"
              defaultMessage="Fleet User Guide"
            />
          </EuiButton>
        }
      />
    </EuiPanel>
  );
}

function renderCloudInstructions(deploymentUrl: string) {
  return (
    <EuiPanel
      grow={false}
      hasShadow={false}
      hasBorder={true}
      className="eui-textCenter"
      paddingSize="l"
    >
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.cloudSetupTitle"
              defaultMessage="Enable APM & Fleet"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.cloudSetupText"
            defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. You can add one to your deployment by enabling APM & Fleet. For more information see the {link}"
            values={{
              link: (
                <EuiLink href="https://ela.st/add-fleet-server" target="_blank" external>
                  <FormattedMessage
                    id="xpack.fleet.settings.userGuideLink"
                    defaultMessage="Fleet User Guide"
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
              href={deploymentUrl}
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
    </EuiPanel>
  );
}

export const FleetServerRequirementPage = () => {
  const startService = useStartServices();
  const deploymentUrl = startService.cloud?.deploymentUrl;

  return (
    <>
      <ContentWrapper justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          {deploymentUrl ? renderCloudInstructions(deploymentUrl) : renderOnPremInstructions()}
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
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
      </ContentWrapper>
      <EuiSpacer size="xxl" />
    </>
  );
};

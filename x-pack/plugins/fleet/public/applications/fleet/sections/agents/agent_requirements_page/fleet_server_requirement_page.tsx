/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
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
  EuiSteps,
  EuiCodeBlock,
  EuiCallOut,
  EuiSelect,
} from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { DownloadStep } from '../components/agent_enrollment_flyout/steps';
import { useStartServices, useGetOutputs } from '../../../hooks';

const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
`;

export const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
  max-width: 800px;
`;

type OS_TYPE = 'linux-mac' | 'windows' | 'deb-rpm';
const OS_OPTIONS: Array<{ text: string; value: OS_TYPE }> = [
  { text: 'Linux / macOS', value: 'linux-mac' },
  { text: 'Windows', value: 'windows' },
  { text: 'RPM / DEB', value: 'deb-rpm' },
];

const OnPremInstructions: React.FC = () => {
  const outputsRequest = useGetOutputs();
  const [serviceToken, setServiceToken] = useState<string>();
  const [os, setOS] = useState<OS_TYPE>('linux-mac');

  const output = outputsRequest.data?.items?.[0];
  const esHost = output?.hosts?.[0];

  const installCommand = useMemo((): string => {
    if (!serviceToken || !esHost) {
      return '';
    }
    switch (os) {
      case 'linux-mac':
        return `./elastic-agent install -f --fleet-server-service-token=${serviceToken} --fleet-server-es=${esHost}`;
      case 'windows':
        return `.\\elastic-agent.exe install --fleet-server-service-token=${serviceToken} --fleet-server-es=${esHost}`;
      case 'deb-rpm':
        return `elastic-agent install -f --fleet-server-service-token=${serviceToken} --fleet-server-es=${esHost}
sudo systemctl enable elastic-agent 
sudo systemctl start elastic-agent`;
      default:
        return '';
    }
  }, [serviceToken, esHost, os]);

  return (
    <EuiPanel paddingSize="l" grow={false} hasShadow={false} hasBorder={true}>
      <EuiSpacer size="s" />
      <EuiText className="eui-textCenter">
        <h2>
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.setupTitle"
            defaultMessage="Add a Fleet Server"
          />
        </h2>
        <EuiSpacer size="m" />
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.setupText"
          defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. See the {userGuideLink} for more information."
          values={{
            userGuideLink: (
              <EuiLink href="https://ela.st/add-fleet-server" external>
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.setupGuideLink"
                  defaultMessage="Fleet User Guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiSteps
        className="eui-textLeft"
        steps={[
          DownloadStep(),
          {
            title: i18n.translate('xpack.fleet.fleetServerSetup.stepGenerateServiceTokenTitle', {
              defaultMessage: 'Generate a service token',
            }),
            children: (
              <>
                <EuiText>
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.generateServiceTokenDescription"
                    defaultMessage="A service token grants Fleet Server permissions to write to Elasticsearch."
                  />
                </EuiText>
                <EuiSpacer size="m" />
                {!serviceToken ? (
                  <EuiButton
                    fill
                    onClick={() => {
                      setServiceToken('test123');
                    }}
                  >
                    <FormattedMessage
                      id="xpack.fleet.fleetServerSetup.generateServiceTokenButton"
                      defaultMessage="Generate service token"
                    />
                  </EuiButton>
                ) : (
                  <>
                    <EuiCallOut size="s">
                      <FormattedMessage
                        id="xpack.fleet.fleetServerSetup.saveServiceTokenDescription"
                        defaultMessage="Save your service token information to register a Fleet Server again in the future. This will be shown only once."
                      />
                    </EuiCallOut>
                    <EuiSpacer size="m" />
                    <EuiFlexGroup alignItems="center">
                      <EuiFlexItem grow={false}>
                        <strong>
                          <FormattedMessage
                            id="xpack.fleet.fleetServerSetup.serviceTokenLabel"
                            defaultMessage="Service token"
                          />
                        </strong>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiCodeBlock paddingSize="m" isCopyable>
                          {serviceToken}
                        </EuiCodeBlock>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )}
              </>
            ),
          },
          {
            title: i18n.translate('xpack.fleet.fleetServerSetup.stepInstallAgentTitle', {
              defaultMessage: 'Install the Elastic Agent as a Fleet Server',
            }),
            status: !serviceToken ? 'disabled' : undefined,
            children: serviceToken ? (
              <>
                <EuiText>
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.installAgentDescription"
                    defaultMessage="From the agent directory, run the appropriate command to install, enroll, and start an Elastic Agent as a Fleet Server. Requires administrator privileges."
                  />
                </EuiText>
                <EuiSpacer size="l" />
                <EuiSelect
                  prepend={
                    <EuiText>
                      <FormattedMessage
                        id="xpack.fleet.fleetServerSetup.osSelectLabel"
                        defaultMessage="OS"
                      />
                    </EuiText>
                  }
                  options={OS_OPTIONS}
                  value={os}
                  onChange={(e) => setOS(e.target.value as OS_TYPE)}
                  aria-label={i18n.translate('xpack.fleet.fleetServerSetup.osSelectAriaLabel', {
                    defaultMessage: 'Operating system',
                  })}
                />
                <EuiSpacer size="s" />
                <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m" language="console">
                  {installCommand}
                </EuiCodeBlock>
              </>
            ) : null,
          },
        ]}
      />
    </EuiPanel>
  );
};

const CloudInstructions: React.FC<{ deploymentUrl: string }> = ({ deploymentUrl }) => {
  return (
    <EuiPanel
      paddingSize="none"
      grow={false}
      hasShadow={false}
      hasBorder={true}
      className="eui-textCenter"
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
};

export const FleetServerRequirementPage = () => {
  const startService = useStartServices();
  const deploymentUrl = startService.cloud?.deploymentUrl;

  return (
    <>
      <ContentWrapper gutterSize="l" justifyContent="center" alignItems="center" direction="column">
        <FlexItemWithMinWidth grow={false}>
          {deploymentUrl ? (
            <CloudInstructions deploymentUrl={deploymentUrl} />
          ) : (
            <OnPremInstructions />
          )}
        </FlexItemWithMinWidth>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
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

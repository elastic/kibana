/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
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
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { DownloadStep } from '../components/agent_enrollment_flyout/steps';
import { useStartServices, useGetOutputs, sendGenerateServiceToken } from '../../../hooks';
import { PLATFORM_OPTIONS, usePlatform } from '../hooks/use_platform';
import type { PLATFORM_TYPE } from '../hooks/use_platform';

const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
  max-width: 100%;
`;

export const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
  max-width: 800px;
`;

// Otherwise the copy button is over the text
const CommandCode = styled.pre({
  overflow: 'scroll',
});

export const ServiceTokenStep = ({
  serviceToken,
  getServiceToken,
  isLoadingServiceToken,
}: {
  serviceToken?: string;
  getServiceToken: () => void;
  isLoadingServiceToken: boolean;
}): EuiStepProps => {
  return {
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
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isLoadingServiceToken}
                isDisabled={isLoadingServiceToken}
                onClick={() => {
                  getServiceToken();
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.generateServiceTokenButton"
                  defaultMessage="Generate service token"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiCallOut size="s">
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.saveServiceTokenDescription"
                defaultMessage="Save your service token information. This will be shown only once."
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <strong>
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.serviceTokenLabel"
                    defaultMessage="Service token"
                  />
                </strong>
              </EuiFlexItem>
              <FlexItemWithMinWidth>
                <EuiCodeBlock paddingSize="m" isCopyable>
                  <CommandCode>{serviceToken}</CommandCode>
                </EuiCodeBlock>
              </FlexItemWithMinWidth>
            </EuiFlexGroup>
          </>
        )}
      </>
    ),
  };
};

export const FleetServerCommandStep = ({
  serviceToken,
  installCommand,
  platform,
  setPlatform,
}: {
  serviceToken?: string;
  installCommand: string;
  platform: string;
  setPlatform: (platform: PLATFORM_TYPE) => void;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepInstallAgentTitle', {
      defaultMessage: 'Start Fleet Server',
    }),
    status: !serviceToken ? 'disabled' : undefined,
    children: serviceToken ? (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.installAgentDescription"
            defaultMessage="From the agent directory, copy and run the appropriate quick start command to start an Elastic Agent as a Fleet Server using the generated token and a self-signed certificate. See the {userGuideLink} for instructions on using your own certificates for production deployment. All commands require administrator privileges."
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
        <EuiSelect
          prepend={
            <EuiText>
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.platformSelectLabel"
                defaultMessage="Platform"
              />
            </EuiText>
          }
          options={PLATFORM_OPTIONS}
          value={platform}
          onChange={(e) => setPlatform(e.target.value as PLATFORM_TYPE)}
          aria-label={i18n.translate('xpack.fleet.fleetServerSetup.platformSelectAriaLabel', {
            defaultMessage: 'Platform',
          })}
        />
        <EuiSpacer size="s" />
        <EuiCodeBlock
          fontSize="m"
          isCopyable={true}
          paddingSize="m"
          language="console"
          whiteSpace="pre"
        >
          <CommandCode>{installCommand}</CommandCode>
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.enrollmentInstructions.troubleshootingText"
            defaultMessage="If you are having trouble connecting, see our {link}."
            values={{
              link: (
                <EuiLink
                  target="_blank"
                  external
                  href="https://www.elastic.co/guide/en/fleet/current/fleet-troubleshooting.html"
                >
                  <FormattedMessage
                    id="xpack.fleet.enrollmentInstructions.troubleshootingLink"
                    defaultMessage="troubleshooting guide"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </>
    ) : null,
  };
};

export function getInstallCommandForPlatform(
  platform: PLATFORM_TYPE,
  esHost: string,
  serviceToken: string,
  policyId?: string
) {
  const commandArguments = `-f --fleet-server-es=${esHost} --fleet-server-service-token=${serviceToken}${
    policyId ? ` --fleet-server-policy=${policyId}` : ''
  }`;

  switch (platform) {
    case 'linux-mac':
      return `sudo ./elastic-agent install ${commandArguments}`;
    case 'windows':
      return `.\\elastic-agent.exe install ${commandArguments}`;
    case 'rpm-deb':
      return `sudo elastic-agent enroll ${commandArguments}`;
    default:
      return '';
  }
}

export const useFleetServerInstructions = (policyId?: string) => {
  const outputsRequest = useGetOutputs();
  const { notifications } = useStartServices();
  const [serviceToken, setServiceToken] = useState<string>();
  const [isLoadingServiceToken, setIsLoadingServiceToken] = useState<boolean>(false);
  const { platform, setPlatform } = usePlatform();

  const output = outputsRequest.data?.items?.[0];
  const esHost = output?.hosts?.[0];

  const installCommand = useMemo((): string => {
    if (!serviceToken || !esHost) {
      return '';
    }

    return getInstallCommandForPlatform(platform, esHost, serviceToken, policyId);
  }, [serviceToken, esHost, platform, policyId]);

  const getServiceToken = useCallback(async () => {
    setIsLoadingServiceToken(true);
    try {
      const { data } = await sendGenerateServiceToken();
      if (data?.value) {
        setServiceToken(data?.value);
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorGeneratingTokenTitleText', {
          defaultMessage: 'Error generating token',
        }),
      });
    }

    setIsLoadingServiceToken(false);
  }, [notifications]);

  return {
    serviceToken,
    getServiceToken,
    isLoadingServiceToken,
    installCommand,
    platform,
    setPlatform,
  };
};

const OnPremInstructions: React.FC = () => {
  const {
    serviceToken,
    getServiceToken,
    isLoadingServiceToken,
    installCommand,
    platform,
    setPlatform,
  } = useFleetServerInstructions();

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
          ServiceTokenStep({ serviceToken, getServiceToken, isLoadingServiceToken }),
          FleetServerCommandStep({ serviceToken, installCommand, platform, setPlatform }),
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiSteps,
  EuiCode,
  EuiCodeBlock,
  EuiCallOut,
  EuiRadioGroup,
  EuiFieldText,
  EuiForm,
  EuiFormErrorText,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DownloadStep, SelectCreateAgentPolicy } from '../../../../components';
import {
  useStartServices,
  useDefaultOutput,
  sendGenerateServiceToken,
  usePlatform,
  useGetAgentPolicies,
  useGetSettings,
  sendPutSettings,
  sendGetFleetStatus,
  useFleetStatus,
  useLink,
} from '../../../../hooks';
import type { PLATFORM_TYPE } from '../../../../hooks';
import type { AgentPolicy } from '../../../../types';
import { FleetServerOnPremRequiredCallout } from '../../components';

import { policyHasFleetServer } from '../../services/has_fleet_server';

import { PlatformSelector } from '../../../../../../components/enrollment_instructions/manual/platform_selector';

import type { CommandsByPlatform } from './install_command_utils';
import { getInstallCommandForPlatform } from './install_command_utils';

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;
const REFRESH_INTERVAL = 10000;

type DeploymentMode = 'production' | 'quickstart';

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
const CommandCode = styled.div.attrs(() => {
  return {
    className: 'eui-textBreakAll',
  };
})`
  margin-right: ${(props) => props.theme.eui.paddingSizes.m};
`;

export const ServiceTokenStep = ({
  disabled = false,
  serviceToken,
  getServiceToken,
  isLoadingServiceToken,
}: {
  disabled?: boolean;
  serviceToken?: string;
  getServiceToken: () => void;
  isLoadingServiceToken: boolean;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepGenerateServiceTokenTitle', {
      defaultMessage: 'Generate a service token',
    }),
    status: disabled ? 'disabled' : undefined,
    children: !disabled && (
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
                data-test-subj="fleetServerGenerateServiceTokenBtn"
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
            <EuiCallOut
              iconType="check"
              size="s"
              color="success"
              title={
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.saveServiceTokenDescription"
                  defaultMessage="Save your service token information. This will be shown only once."
                />
              }
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="column" gutterSize="s">
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
  installCommand: CommandsByPlatform;
  platform: string;
  setPlatform: (platform: PLATFORM_TYPE) => void;
}): EuiStepProps => {
  const { docLinks } = useStartServices();

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
                <EuiLink
                  href={docLinks.links.fleet.fleetServerAddFleetServer}
                  external
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.setupGuideLink"
                    defaultMessage="Fleet and Elastic Agent Guide"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <PlatformSelector
          linuxCommand={installCommand.linux}
          macCommand={installCommand.mac}
          windowsCommand={installCommand.windows}
          linuxDebCommand={installCommand.deb}
          linuxRpmCommand={installCommand.rpm}
          isK8s={false}
        />
      </>
    ) : null,
  };
};

export const useFleetServerInstructions = (policyId?: string) => {
  const { output } = useDefaultOutput();
  const { notifications } = useStartServices();
  const [serviceToken, setServiceToken] = useState<string>();
  const [isLoadingServiceToken, setIsLoadingServiceToken] = useState<boolean>(false);
  const { platform, setPlatform } = usePlatform();
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('production');
  const { data: settings, resendRequest: refreshSettings } = useGetSettings();
  const fleetServerHost = settings?.item.fleet_server_hosts?.[0];
  const esHost = output?.hosts?.[0];
  const sslCATrustedFingerprint: string | undefined = output?.ca_trusted_fingerprint;

  const installCommand = useMemo((): CommandsByPlatform => {
    if (!serviceToken || !esHost) {
      return {
        linux: '',
        mac: '',
        windows: '',
        deb: '',
        rpm: '',
      };
    }

    return getInstallCommandForPlatform(
      esHost,
      serviceToken,
      policyId,
      fleetServerHost,
      deploymentMode === 'production',
      sslCATrustedFingerprint
    );
  }, [serviceToken, esHost, policyId, fleetServerHost, deploymentMode, sslCATrustedFingerprint]);

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
  }, [notifications.toasts]);

  const addFleetServerHost = useCallback(
    async (host: string) => {
      const res = await sendPutSettings({
        fleet_server_hosts: [host, ...(settings?.item.fleet_server_hosts || [])],
      });
      if (res.error) {
        throw res.error;
      }
      await refreshSettings();
    },
    [refreshSettings, settings?.item.fleet_server_hosts]
  );

  return {
    addFleetServerHost,
    fleetServerHost,
    deploymentMode,
    setDeploymentMode,
    serviceToken,
    getServiceToken,
    isLoadingServiceToken,
    installCommand,
    platform,
    setPlatform,
  };
};

const AgentPolicySelectionStep = ({
  selectedPolicy,
  setPolicyId,
  agentPolicies,
  refreshAgentPolicies,
}: {
  selectedPolicy?: AgentPolicy;
  setPolicyId: (v?: string) => void;
  agentPolicies: AgentPolicy[];
  refreshAgentPolicies: () => void;
}): EuiStepProps => {
  return {
    title:
      agentPolicies.length === 0
        ? i18n.translate('xpack.fleet.fleetServerSetup.stepCreateAgentPolicyTitle', {
            defaultMessage: 'Create an agent policy to host Fleet Server',
          })
        : i18n.translate('xpack.fleet.fleetServerSetup.stepSelectAgentPolicyTitle', {
            defaultMessage: 'Select an agent policy to host Fleet Server',
          }),
    status: undefined,
    children: (
      <>
        <SelectCreateAgentPolicy
          agentPolicies={agentPolicies}
          withKeySelection={false}
          excludeFleetServer={false}
          isFleetServerPolicy={true}
          selectedPolicy={selectedPolicy}
          setSelectedPolicyId={setPolicyId}
          refreshAgentPolicies={refreshAgentPolicies}
        />
      </>
    ),
  };
};

export const addFleetServerHostStep = ({
  addFleetServerHost,
}: {
  addFleetServerHost: (v: string) => Promise<void>;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostStepTitle', {
      defaultMessage: 'Add your Fleet Server host',
    }),
    status: undefined,
    children: <AddFleetServerHostStepContent addFleetServerHost={addFleetServerHost} />,
  };
};

export const AddFleetServerHostStepContent = ({
  addFleetServerHost,
}: {
  addFleetServerHost: (v: string) => Promise<void>;
}) => {
  const [calloutHost, setCalloutHost] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [fleetServerHost, setFleetServerHost] = useState('');
  const [error, setError] = useState<undefined | string>();
  const { notifications } = useStartServices();

  const { getHref } = useLink();

  const validate = useCallback(
    (host: string) => {
      if (host.match(URL_REGEX)) {
        setError(undefined);
        return true;
      } else {
        setError(
          i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostInvalidUrlError', {
            defaultMessage: 'Invalid URL',
          })
        );
        return false;
      }
    },
    [setError]
  );

  const onSubmit = useCallback(async () => {
    try {
      setIsLoading(true);
      if (validate(fleetServerHost)) {
        await addFleetServerHost(fleetServerHost);
        setCalloutHost(fleetServerHost);
        setFleetServerHost('');
      } else {
        setCalloutHost('');
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorAddingFleetServerHostTitle', {
          defaultMessage: 'Error adding Fleet Server host',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, [fleetServerHost, addFleetServerHost, validate, notifications.toasts]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFleetServerHost(e.target.value);
      if (error) {
        validate(e.target.value);
      }
    },
    [error, validate, setFleetServerHost]
  );

  return (
    <EuiForm onSubmit={onSubmit}>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.addFleetServerHostStepDescription"
          defaultMessage="Specify the URL your agents will use to connect to Fleet Server. This should match the public IP address or domain of the host where Fleet Server will run. By default, Fleet Server uses port {port}."
          values={{ port: <EuiCode>8220</EuiCode> }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            placeholder={'e.g. https://127.0.0.1:8220'}
            value={fleetServerHost}
            isInvalid={!!error}
            onChange={onChange}
            disabled={isLoading}
            prepend={
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.addFleetServerHostInputLabel"
                  defaultMessage="Fleet Server host"
                />
              </EuiText>
            }
            data-test-subj="fleetServerHostInput"
          />
          {error && <EuiFormErrorText>{error}</EuiFormErrorText>}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={isLoading}
            onClick={onSubmit}
            data-test-subj="fleetServerAddHostBtn"
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostButton"
              defaultMessage="Add host"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {calloutHost && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            iconType="check"
            size="s"
            color="success"
            title={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.addFleetServerHostSuccessTitle"
                defaultMessage="Added Fleet Server host"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostSuccessText"
              defaultMessage="Added {host}. You can edit your Fleet Server hosts in {fleetSettingsLink}."
              values={{
                host: calloutHost,
                fleetSettingsLink: (
                  <EuiLink href={getHref('settings')}>
                    <FormattedMessage
                      id="xpack.fleet.fleetServerSetup.fleetSettingsLink"
                      defaultMessage="Fleet Settings"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiCallOut>
        </>
      )}
    </EuiForm>
  );
};

export const deploymentModeStep = ({
  deploymentMode,
  setDeploymentMode,
}: {
  deploymentMode: DeploymentMode;
  setDeploymentMode: (v: DeploymentMode) => void;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepDeploymentModeTitle', {
      defaultMessage: 'Choose a deployment mode for security',
    }),
    status: undefined,
    children: (
      <DeploymentModeStepContent
        deploymentMode={deploymentMode}
        setDeploymentMode={setDeploymentMode}
      />
    ),
  };
};

const DeploymentModeStepContent = ({
  deploymentMode,
  setDeploymentMode,
}: {
  deploymentMode: DeploymentMode;
  setDeploymentMode: (v: DeploymentMode) => void;
}) => {
  const onChangeCallback = useCallback(
    (v: string) => {
      const value = v.split('_')[0];
      if (value === 'production' || value === 'quickstart') {
        setDeploymentMode(value);
      }
    },
    [setDeploymentMode]
  );

  // radio id has to be unique so that the component works even if appears twice in DOM (Agents tab, Add agent flyout)
  const radioSuffix = useMemo(() => Date.now(), []);

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.stepDeploymentModeDescriptionText"
          defaultMessage="Fleet uses Transport Layer Security (TLS) to encrypt traffic between Elastic Agents and other components in the Elastic Stack. Choose a deployment mode to determine how you wish to handle certificates. Your selection will affect the Fleet Server set up command shown in a later step."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={[
          {
            id: `quickstart_${radioSuffix}`,
            label: (
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.deploymentModeQuickStartOption"
                defaultMessage="{quickStart} – Fleet Server will generate a self-signed certificate. Subsequent agents must be enrolled using the --insecure flag. Not recommended for production use cases."
                values={{
                  quickStart: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.fleetServerSetup.quickStartText"
                        defaultMessage="Quick start"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
          {
            id: `production_${radioSuffix}`,
            label: (
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.deploymentModeProductionOption"
                defaultMessage="{production} – Provide your own certificates. This option will require agents to specify a cert key when enrolling with Fleet"
                values={{
                  production: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.fleetServerSetup.productionText"
                        defaultMessage="Production"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
        ]}
        idSelected={`${deploymentMode}_${radioSuffix}`}
        onChange={onChangeCallback}
        name={`radio group ${radioSuffix}`}
      />
    </>
  );
};

const WaitingForFleetServerStep = ({
  status,
}: {
  status: 'loading' | 'disabled' | 'complete';
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepWaitingForFleetServerTitle', {
      defaultMessage: 'Waiting for Fleet Server to connect...',
    }),
    status,
    children: undefined,
  };
};

const CompleteStep = (): EuiStepProps => {
  const fleetStatus = useFleetStatus();

  const onContinueClick = () => {
    fleetStatus.refresh();
  };

  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepFleetServerCompleteTitle', {
      defaultMessage: 'Fleet Server connected',
    }),
    status: 'complete',
    children: (
      <>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.stepFleetServerCompleteDescription"
          defaultMessage="You can now enroll agents with Fleet."
        />
        <EuiSpacer size="m" />
        <EuiButton fill onClick={onContinueClick}>
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.continueButton"
            defaultMessage="Continue"
          />
        </EuiButton>
      </>
    ),
  };
};

const findPolicyById = (policies: AgentPolicy[], id: string | undefined) => {
  if (!id) return undefined;
  return policies.find((p) => p.id === id);
};

export const OnPremInstructions: React.FC = () => {
  const { notifications } = useStartServices();

  const { data, resendRequest: refreshAgentPolicies } = useGetAgentPolicies({ full: true });

  const agentPolicies = useMemo(
    () => (data ? data.items.filter((item) => policyHasFleetServer(item)) : []),
    [data]
  );

  // Select default value
  let defaultValue = '';
  if (agentPolicies.length) {
    defaultValue = agentPolicies[0].id;
  }
  const [policyId, setPolicyId] = useState<string | undefined>(defaultValue);
  const selectedPolicy = findPolicyById(agentPolicies, policyId);

  const {
    serviceToken,
    getServiceToken,
    isLoadingServiceToken,
    installCommand,
    platform,
    setPlatform,
    deploymentMode,
    setDeploymentMode,
    fleetServerHost,
    addFleetServerHost,
  } = useFleetServerInstructions(policyId);

  const { docLinks } = useStartServices();

  const [isWaitingForFleetServer, setIsWaitingForFleetServer] = useState(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await sendGetFleetStatus();
        if (res.error) {
          throw res.error;
        }
        if (res.data?.isReady && !res.data?.missing_requirements?.includes('fleet_server')) {
          setIsWaitingForFleetServer(false);
        }
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.fleetServerSetup.errorRefreshingFleetServerStatus', {
            defaultMessage: 'Error refreshing Fleet Server status',
          }),
        });
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [notifications.toasts]);

  return (
    <>
      <FleetServerOnPremRequiredCallout />
      <EuiSpacer size="xl" />
      <EuiText>
        <h2>
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.setupTitle"
            defaultMessage="Add a Fleet Server"
          />
        </h2>
        <EuiSpacer size="m" />
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.setupText"
          defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. Follow the instructions below to set up a Fleet Server. For more information, see the {userGuideLink}."
          values={{
            userGuideLink: (
              <EuiLink
                href={docLinks.links.fleet.fleetServerAddFleetServer}
                external
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.setupGuideLink"
                  defaultMessage="Fleet and Elastic Agent Guide"
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
          AgentPolicySelectionStep({
            selectedPolicy,
            setPolicyId,
            agentPolicies,
            refreshAgentPolicies,
          }),
          DownloadStep(true),
          deploymentModeStep({ deploymentMode, setDeploymentMode }),
          addFleetServerHostStep({ addFleetServerHost }),
          ServiceTokenStep({
            disabled: deploymentMode === 'production' && !fleetServerHost,
            serviceToken,
            getServiceToken,
            isLoadingServiceToken,
          }),
          FleetServerCommandStep({ serviceToken, installCommand, platform, setPlatform }),
          isWaitingForFleetServer
            ? WaitingForFleetServerStep({
                status: !serviceToken ? 'disabled' : 'loading',
              })
            : CompleteStep(),
        ]}
      />
    </>
  );
};

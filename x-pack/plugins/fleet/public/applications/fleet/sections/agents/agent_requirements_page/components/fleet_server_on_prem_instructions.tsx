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
  EuiSelect,
  EuiRadioGroup,
  EuiFieldText,
  EuiForm,
  EuiFormErrorText,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { DownloadStep } from '../../../../components';
import {
  useStartServices,
  useDefaultOutput,
  sendGenerateServiceToken,
  usePlatform,
  PLATFORM_OPTIONS,
  useGetAgentPolicies,
  useGetSettings,
  sendPutSettings,
  sendGetFleetStatus,
  useFleetStatus,
  useUrlModal,
} from '../../../../hooks';
import type { PLATFORM_TYPE } from '../../../../hooks';
import type { PackagePolicy } from '../../../../types';
import { FLEET_SERVER_PACKAGE } from '../../../../constants';

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
  installCommand: string;
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
          whiteSpace="pre-wrap"
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
                <EuiLink target="_blank" external href={docLinks.links.fleet.troubleshooting}>
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

export const useFleetServerInstructions = (policyId?: string) => {
  const { output, refresh: refreshOutputs } = useDefaultOutput();
  const { notifications } = useStartServices();
  const [serviceToken, setServiceToken] = useState<string>();
  const [isLoadingServiceToken, setIsLoadingServiceToken] = useState<boolean>(false);
  const { platform, setPlatform } = usePlatform();
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('production');
  const { data: settings, resendRequest: refreshSettings } = useGetSettings();
  const fleetServerHost = settings?.item.fleet_server_hosts?.[0];
  const esHost = output?.hosts?.[0];

  const installCommand = useMemo((): string => {
    if (!serviceToken || !esHost) {
      return '';
    }

    return getInstallCommandForPlatform(
      platform,
      esHost,
      serviceToken,
      policyId,
      fleetServerHost,
      deploymentMode === 'production'
    );
  }, [serviceToken, esHost, platform, policyId, fleetServerHost, deploymentMode]);

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

  const refresh = useCallback(() => {
    return Promise.all([refreshOutputs(), refreshSettings()]);
  }, [refreshOutputs, refreshSettings]);

  const addFleetServerHost = useCallback(
    async (host: string) => {
      try {
        await sendPutSettings({
          fleet_server_hosts: [host, ...(settings?.item.fleet_server_hosts || [])],
        });
        await refreshSettings();
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.fleetServerSetup.errorAddingFleetServerHostTitle', {
            defaultMessage: 'Error adding Fleet Server host',
          }),
        });
      }
    },
    [refreshSettings, notifications.toasts, settings?.item.fleet_server_hosts]
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
    refresh,
  };
};

const AgentPolicySelectionStep = ({
  policyId,
  setPolicyId,
}: {
  policyId?: string;
  setPolicyId: (v: string) => void;
}): EuiStepProps => {
  const { data } = useGetAgentPolicies({ full: true });

  const agentPolicies = useMemo(
    () =>
      data
        ? data.items.filter((item) => {
            return item.package_policies.some(
              (p: string | PackagePolicy) =>
                (p as PackagePolicy).package?.name === FLEET_SERVER_PACKAGE
            );
            return false;
          })
        : [],
    [data]
  );

  const options = useMemo(() => {
    return agentPolicies.map((policy) => ({ text: policy.name, value: policy.id }));
  }, [agentPolicies]);

  useEffect(() => {
    // Select default value
    if (agentPolicies.length && !policyId) {
      const defaultPolicy =
        agentPolicies.find((p) => p.is_default_fleet_server) || agentPolicies[0];
      setPolicyId(defaultPolicy.id);
    }
  }, [options, agentPolicies, policyId, setPolicyId]);

  const onChangeCallback = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPolicyId(e.target.value);
    },
    [setPolicyId]
  );

  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepSelectAgentPolicyTitle', {
      defaultMessage: 'Select an Agent policy',
    }),
    status: undefined,
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.selectAgentPolicyDescriptionText"
            defaultMessage="Agent policies allow you to configure and mange your agents remotely. We recommend using the “Default Fleet Server policy” which includes the necessary configuration to run a Fleet Server."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSelect
          prepend={
            <EuiText>
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.agentPolicySelectLabel"
                defaultMessage="Agent policy"
              />
            </EuiText>
          }
          options={options}
          value={policyId}
          onChange={onChangeCallback}
          aria-label={i18n.translate('xpack.fleet.fleetServerSetup.agentPolicySelectAraiLabel', {
            defaultMessage: 'Agent policy',
          })}
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
  const { getModalHref } = useUrlModal();

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
    } finally {
      setIsLoading(false);
    }
  }, [fleetServerHost, addFleetServerHost, validate]);

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
            placeholder={'e.g. http://127.0.0.1:8220'}
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
          />
          {error && <EuiFormErrorText>{error}</EuiFormErrorText>}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton isLoading={isLoading} onClick={onSubmit}>
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
                  <EuiLink href={getModalHref('settings')}>
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
      if (v === 'production' || v === 'quickstart') {
        setDeploymentMode(v);
      }
    },
    [setDeploymentMode]
  );

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
            id: 'quickstart',
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
            id: 'production',
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
        idSelected={deploymentMode}
        onChange={onChangeCallback}
        name="radio group"
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

export const OnPremInstructions: React.FC = () => {
  const { notifications } = useStartServices();
  const [policyId, setPolicyId] = useState<string | undefined>();

  const {
    serviceToken,
    getServiceToken,
    isLoadingServiceToken,
    installCommand,
    platform,
    setPlatform,
    refresh,
    deploymentMode,
    setDeploymentMode,
    fleetServerHost,
    addFleetServerHost,
  } = useFleetServerInstructions(policyId);

  const { modal } = useUrlModal();
  useEffect(() => {
    // Refresh settings when the settings modal is closed
    if (!modal) {
      refresh();
    }
  }, [modal, refresh]);

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
          DownloadStep(),
          AgentPolicySelectionStep({ policyId, setPolicyId }),
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

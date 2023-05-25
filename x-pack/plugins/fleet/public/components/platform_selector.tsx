/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiText,
  EuiSpacer,
  EuiCodeBlock,
  EuiButtonGroup,
  EuiCallOut,
  EuiButton,
  EuiCopy,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE,
  FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
} from '../../common/constants/epm';
import { type PLATFORM_TYPE } from '../hooks';
import { REDUCED_PLATFORM_OPTIONS, PLATFORM_OPTIONS, usePlatform } from '../hooks';

import { KubernetesInstructions } from './agent_enrollment_flyout/kubernetes_instructions';
import type { CloudSecurityIntegration } from './agent_enrollment_flyout/types';

interface Props {
  linuxCommand: string;
  macCommand: string;
  windowsCommand: string;
  linuxDebCommand: string;
  linuxRpmCommand: string;
  k8sCommand: string;
  hasK8sIntegration: boolean;
  cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
  hasK8sIntegrationMultiPage: boolean;
  isManaged?: boolean;
  hasFleetServer?: boolean;
  enrollToken?: string | undefined;
  fullCopyButton?: boolean;
  onCopy?: () => void;
}

// Otherwise the copy button is over the text
const CommandCode = styled.pre({
  overflow: 'auto',
});

export const PlatformSelector: React.FunctionComponent<Props> = ({
  linuxCommand,
  macCommand,
  windowsCommand,
  linuxDebCommand,
  linuxRpmCommand,
  k8sCommand,
  hasK8sIntegration,
  cloudSecurityIntegration,
  hasK8sIntegrationMultiPage,
  isManaged,
  enrollToken,
  hasFleetServer,
  fullCopyButton,
  onCopy,
}) => {
  const getInitialPlatform = useCallback(() => {
    if (
      hasK8sIntegration ||
      (cloudSecurityIntegration?.integrationType ===
        FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE &&
        isManaged)
    )
      return 'kubernetes';

    return 'linux';
  }, [hasK8sIntegration, cloudSecurityIntegration?.integrationType, isManaged]);

  const { platform, setPlatform } = usePlatform(getInitialPlatform());

  // In case of fleet server installation or standalone agent without
  // Kubernetes integration in the policy use reduced platform options
  const isReduced = hasFleetServer || (!isManaged && !hasK8sIntegration);

  const getPlatformOptions = useCallback(() => {
    const platformOptions = isReduced ? REDUCED_PLATFORM_OPTIONS : PLATFORM_OPTIONS;

    return platformOptions;
  }, [isReduced]);

  const [copyButtonClicked, setCopyButtonClicked] = useState(false);

  const systemPackageCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.enrollmentInstructions.callout', {
        defaultMessage:
          'We recommend using the installers (TAR/ZIP) over system packages (RPM/DEB) because they provide the ability to upgrade your agent with Fleet.',
      })}
      color="warning"
      iconType="warning"
    />
  );

  const k8sCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.enrollmentInstructions.k8sCallout', {
        defaultMessage:
          'We recommend adding the Kubernetes integration to your agent policy in order to get useful metrics and logs from your Kubernetes clusters.',
      })}
      color="warning"
      iconType="warning"
    />
  );

  const k8sCSPMCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.enrollmentInstructions.placeHolderCallout', {
        defaultMessage:
          'We strongly advise against deploying CSPM within a Kubernetes cluster. Doing so may lead to redundant data fetching, which can cause increased consumption costs within your Elastic account and potentially trigger API rate limiting in your cloud account(s).',
      })}
      color="warning"
      iconType="warning"
    />
  );

  const macCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.enrollmentInstructions.macCallout', {
        defaultMessage:
          'We recommend against deploying this integration within Mac as it is currently not being supported.',
      })}
      color="warning"
      iconType="warning"
    />
  );

  const commandsByPlatform: Record<PLATFORM_TYPE, string> = {
    linux: linuxCommand,
    mac: macCommand,
    windows: windowsCommand,
    deb: linuxDebCommand,
    rpm: linuxRpmCommand,
    kubernetes: k8sCommand,
  };
  const onTextAreaClick = () => {
    if (onCopy) onCopy();
  };
  const onCopyButtonClick = (copy: () => void) => {
    copy();
    setCopyButtonClicked(true);
    if (onCopy) onCopy();
  };

  return (
    <>
      <>
        {!hasK8sIntegrationMultiPage && (
          <EuiButtonGroup
            options={getPlatformOptions()}
            idSelected={platform}
            onChange={(id) => setPlatform(id as PLATFORM_TYPE)}
            legend={i18n.translate('xpack.fleet.enrollmentInstructions.platformSelectAriaLabel', {
              defaultMessage: 'Platform',
            })}
          />
        )}
        <EuiSpacer size="s" />
        {(platform === 'deb' || platform === 'rpm') && (
          <>
            {systemPackageCallout}
            <EuiSpacer size="m" />
          </>
        )}
        {platform === 'mac' &&
          (cloudSecurityIntegration?.integrationType ===
            FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE ||
            cloudSecurityIntegration?.integrationType ===
              FLEET_CLOUD_SECURITY_POSTURE_KSPM_POLICY_TEMPLATE) && (
            <>
              {macCallout}
              <EuiSpacer size="m" />
            </>
          )}
        {platform === 'kubernetes' &&
          cloudSecurityIntegration?.integrationType ===
            FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE && (
            <>
              {k8sCSPMCallout}
              <EuiSpacer size="m" />
            </>
          )}
        {platform === 'kubernetes' && !hasK8sIntegration && (
          <>
            {k8sCallout}
            <EuiSpacer size="m" />
          </>
        )}
        {platform === 'kubernetes' && isManaged && (
          <>
            <KubernetesInstructions
              onCopy={onCopy}
              onDownload={onCopy}
              enrollmentAPIKey={enrollToken}
            />
            <EuiSpacer size="s" />
          </>
        )}
        {!hasK8sIntegrationMultiPage && (
          <>
            {platform === 'kubernetes' && (
              <EuiText>
                <EuiSpacer size="s" />
                <FormattedMessage
                  id="xpack.fleet.agentEnrollment.kubernetesCommandInstructions"
                  defaultMessage="From the directory where the manifest is downloaded, run the apply command."
                />
                <EuiSpacer size="m" />
              </EuiText>
            )}
            <EuiCodeBlock
              onClick={onTextAreaClick}
              fontSize="m"
              isCopyable={!fullCopyButton}
              paddingSize="m"
              css={`
                max-width: 1100px;
              `}
            >
              <CommandCode>{commandsByPlatform[platform]}</CommandCode>
            </EuiCodeBlock>
            <EuiSpacer size="s" />
            {fullCopyButton && (
              <EuiCopy textToCopy={commandsByPlatform[platform]}>
                {(copy) => (
                  <EuiButton
                    color="primary"
                    iconType="copyClipboard"
                    size="m"
                    onClick={() => onCopyButtonClick(copy)}
                  >
                    {copyButtonClicked ? (
                      <FormattedMessage
                        id="xpack.fleet.enrollmentInstructions.copyButtonClicked"
                        defaultMessage="Copied"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.fleet.enrollmentInstructions.copyButton"
                        defaultMessage="Copy to clipboard"
                      />
                    )}
                  </EuiButton>
                )}
              </EuiCopy>
            )}
          </>
        )}
      </>
    </>
  );
};

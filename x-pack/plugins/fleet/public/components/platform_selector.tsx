/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
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

import type { PLATFORM_TYPE } from '../hooks';
import { REDUCED_PLATFORM_OPTIONS, PLATFORM_OPTIONS, usePlatform } from '../hooks';

import { KubernetesInstructions } from './agent_enrollment_flyout/kubernetes_instructions';

interface Props {
  linuxCommand: string;
  macCommand: string;
  windowsCommand: string;
  linuxDebCommand: string;
  linuxRpmCommand: string;
  k8sCommand: string;
  hasK8sIntegration: boolean;
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
  hasK8sIntegrationMultiPage,
  isManaged,
  enrollToken,
  hasFleetServer,
  fullCopyButton,
  onCopy,
}) => {
  const { platform, setPlatform } = usePlatform();

  useEffect(() => {
    setPlatform(hasK8sIntegration ? 'kubernetes' : 'linux');
  }, [hasK8sIntegration, setPlatform]);

  // In case of fleet server installation or standalone agent without
  // Kubernetes integration in the policy use reduced platform options
  const useReduce = hasFleetServer || (!isManaged && !hasK8sIntegration);

  const [copyButtonClicked, setCopyButtonClicked] = useState(false);

  const systemPackageCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.enrollmentInstructions.callout', {
        defaultMessage:
          'We recommend using the installers (TAR/ZIP) over system packages (RPM/DEB) because they provide the ability to upgrade your agent with Fleet.',
      })}
      color="warning"
      iconType="alert"
    />
  );

  const k8sCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.enrollmentInstructions.k8sCallout', {
        defaultMessage:
          'We recommend adding the Kubernetes integration to your agent policy in order to get useful metrics and logs from your Kubernetes clusters.',
      })}
      color="warning"
      iconType="alert"
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
            options={useReduce ? REDUCED_PLATFORM_OPTIONS : PLATFORM_OPTIONS}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
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
import { PLATFORM_OPTIONS, usePlatform } from '../hooks';

interface Props {
  linuxCommand: string;
  macCommand: string;
  windowsCommand: string;
  linuxDebCommand: string;
  linuxRpmCommand: string;
  isK8s: boolean;
  fullCopyButton?: boolean;
  onCopy?: () => void;
}

// Otherwise the copy button is over the text
const CommandCode = styled.pre({
  overflow: 'auto',
});

const K8S_COMMAND = `kubectl apply -f elastic-agent-managed-kubernetes.yaml`;

export const PlatformSelector: React.FunctionComponent<Props> = ({
  linuxCommand,
  macCommand,
  windowsCommand,
  linuxDebCommand,
  linuxRpmCommand,
  isK8s,
  fullCopyButton,
  onCopy,
}) => {
  const { platform, setPlatform } = usePlatform();
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

  const commandsByPlatform: Record<PLATFORM_TYPE, string> = {
    linux: linuxCommand,
    mac: macCommand,
    windows: windowsCommand,
    deb: linuxDebCommand,
    rpm: linuxRpmCommand,
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
      {isK8s ? (
        <EuiCodeBlock fontSize="m" isCopyable={!fullCopyButton} paddingSize="m">
          <CommandCode>{K8S_COMMAND}</CommandCode>
        </EuiCodeBlock>
      ) : (
        <>
          <EuiButtonGroup
            options={PLATFORM_OPTIONS}
            idSelected={platform}
            onChange={(id) => setPlatform(id as PLATFORM_TYPE)}
            legend={i18n.translate('xpack.fleet.enrollmentInstructions.platformSelectAriaLabel', {
              defaultMessage: 'Platform',
            })}
          />
          <EuiSpacer size="s" />
          {(platform === 'deb' || platform === 'rpm') && (
            <>
              {systemPackageCallout}
              <EuiSpacer size="m" />
            </>
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
  );
};

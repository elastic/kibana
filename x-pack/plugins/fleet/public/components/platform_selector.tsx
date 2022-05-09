/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiSpacer, EuiCodeBlock, EuiButtonGroup, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { PLATFORM_TYPE } from '../hooks';
import { PLATFORM_OPTIONS, usePlatform } from '../hooks';

interface Props {
  linuxCommand: string;
  macCommand: string;
  windowsCommand: string;
  linuxDebCommand: string;
  linuxRpmCommand: string;
  isK8s: boolean;
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
}) => {
  const { platform, setPlatform } = usePlatform();

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

  return (
    <>
      {isK8s ? (
        <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
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
          {platform === 'linux' && (
            <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
              <CommandCode>{linuxCommand}</CommandCode>
            </EuiCodeBlock>
          )}
          {platform === 'mac' && (
            <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
              <CommandCode>{macCommand}</CommandCode>
            </EuiCodeBlock>
          )}
          {platform === 'windows' && (
            <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
              <CommandCode>{windowsCommand}</CommandCode>
            </EuiCodeBlock>
          )}
          {platform === 'deb' && (
            <>
              {systemPackageCallout}
              <EuiSpacer size="m" />
              <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
                <CommandCode>{linuxDebCommand}</CommandCode>
              </EuiCodeBlock>
            </>
          )}
          {platform === 'rpm' && (
            <>
              {systemPackageCallout}
              <EuiSpacer size="m" />
              <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
                <CommandCode>{linuxRpmCommand}</CommandCode>
              </EuiCodeBlock>
            </>
          )}
        </>
      )}
    </>
  );
};

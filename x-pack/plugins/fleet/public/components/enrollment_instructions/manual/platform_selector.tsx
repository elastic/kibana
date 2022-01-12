/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiText, EuiSpacer, EuiLink, EuiCodeBlock, EuiButtonGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { PLATFORM_TYPE } from '../../../hooks';
import { PLATFORM_OPTIONS, usePlatform } from '../../../hooks';

interface Props {
  linuxMacCommand: string;
  windowsCommand: string;
  installAgentLink: string;
  troubleshootLink: string;
  isK8s: boolean;
}

// Otherwise the copy button is over the text
const CommandCode = styled.pre({
  overflow: 'auto',
});

export const PlatformSelector: React.FunctionComponent<Props> = ({
  linuxMacCommand,
  windowsCommand,
  installAgentLink,
  troubleshootLink,
  isK8s,
}) => {
  const { platform, setPlatform } = usePlatform();

  return (
    <>
      <EuiText>
        {isK8s ? (
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.stepRunAgentDescriptionk8s"
            defaultMessage="From the directory where the Kubernetes manifest is downloaded, run the apply command."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.stepRunAgentDescription"
            defaultMessage="From the agent directory, run this command to install, enroll and start an Elastic Agent. You can reuse this command to set up agents on more than one host. Requires administrator privileges."
          />
        )}
      </EuiText>
      <EuiSpacer size="l" />
      {isK8s ? (
        <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
          <CommandCode>{linuxMacCommand}</CommandCode>
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
          {platform === 'linux-mac' && (
            <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
              <CommandCode>{linuxMacCommand}</CommandCode>
            </EuiCodeBlock>
          )}
          {platform === 'windows' && (
            <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
              <CommandCode>{windowsCommand}</CommandCode>
            </EuiCodeBlock>
          )}
          {platform === 'rpm-deb' && (
            <EuiText>
              <FormattedMessage
                id="xpack.fleet.enrollmentInstructions.moreInstructionsText"
                defaultMessage="See the {link} for RPM / DEB deploy instructions."
                values={{
                  link: (
                    <EuiLink target="_blank" external href={installAgentLink}>
                      <FormattedMessage
                        id="xpack.fleet.enrollmentInstructions.moreInstructionsLink"
                        defaultMessage="Elastic Agent docs"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          )}
        </>
      )}
      <EuiSpacer size="l" />
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.enrollmentInstructions.troubleshootingText"
          defaultMessage="If you are having trouble connecting, see our {link}."
          values={{
            link: (
              <EuiLink target="_blank" external href={troubleshootLink}>
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
  );
};

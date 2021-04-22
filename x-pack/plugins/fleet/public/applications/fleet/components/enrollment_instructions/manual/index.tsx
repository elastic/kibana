/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiText, EuiSpacer, EuiLink, EuiTitle, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import type { EnrollmentAPIKey } from '../../../types';

interface Props {
  fleetServerHosts: string[];
  apiKey: EnrollmentAPIKey;
}

// Otherwise the copy button is over the text
const CommandCode = styled.pre({
  overflow: 'scroll',
});

function getfleetServerHostsEnrollArgs(apiKey: EnrollmentAPIKey, fleetServerHosts: string[]) {
  return `--url=${fleetServerHosts[0]} --enrollment-token=${apiKey.api_key}`;
}

export const ManualInstructions: React.FunctionComponent<Props> = ({
  apiKey,
  fleetServerHosts,
}) => {
  const enrollArgs = getfleetServerHostsEnrollArgs(apiKey, fleetServerHosts);

  const linuxMacCommand = `./elastic-agent install -f ${enrollArgs}`;

  const windowsCommand = `.\\elastic-agent.exe install -f ${enrollArgs}`;

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.enrollmentInstructions.descriptionText"
          defaultMessage="From the agent directory, run the appropriate command to install, enroll, and start an Elastic Agent. You can reuse these commands to set up agents on more than one host. Requires administrator privileges."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.enrollmentInstructions.linuxMacOSTitle"
            defaultMessage="Linux, macOS"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
        <CommandCode>{linuxMacCommand}</CommandCode>
      </EuiCodeBlock>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.enrollmentInstructions.windowsTitle"
            defaultMessage="Windows"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
        <CommandCode>{windowsCommand}</CommandCode>
      </EuiCodeBlock>
      <EuiSpacer size="l" />
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.enrollmentInstructions.moreInstructionsText"
          defaultMessage="See the {link} for RPM / DEB deploy instructions."
          values={{
            link: (
              <EuiLink
                target="_blank"
                external
                href="https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation-configuration.html"
              >
                <FormattedMessage
                  id="xpack.fleet.enrollmentInstructions.moreInstructionsLink"
                  defaultMessage="Elastic Agent docs"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};

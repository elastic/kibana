/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiText, EuiSpacer, EuiLink, EuiTitle, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EnrollmentAPIKey } from '../../../types';

interface Props {
  kibanaUrl: string;
  apiKey: EnrollmentAPIKey;
  kibanaCASha256?: string;
}

// Otherwise the copy button is over the text
const CommandCode = styled.pre({
  overflow: 'scroll',
});

export const ManualInstructions: React.FunctionComponent<Props> = ({
  kibanaUrl,
  apiKey,
  kibanaCASha256,
}) => {
  const enrollArgs = `--kibana-url=${kibanaUrl} --enrollment-token=${apiKey.api_key}${
    kibanaCASha256 ? ` --ca_sha256=${kibanaCASha256}` : ''
  }`;

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
          defaultMessage="See the {link} for more instructions and options."
          values={{
            link: (
              <EuiLink
                target="_blank"
                external
                href="https://www.elastic.co/guide/en/ingest-management/current/elastic-agent-installation-configuration.html"
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

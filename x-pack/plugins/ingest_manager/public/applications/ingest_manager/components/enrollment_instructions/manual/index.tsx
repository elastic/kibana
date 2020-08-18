/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiText, EuiSpacer, EuiCode, EuiTitle, EuiCodeBlock } from '@elastic/eui';
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
  const enrollArgs = `${kibanaUrl} ${apiKey.api_key}${
    kibanaCASha256 ? ` --ca_sha256=${kibanaCASha256}` : ''
  }`;
  const macOsLinuxTarCommand = `./elastic-agent enroll ${enrollArgs}
./elastic-agent run`;

  const linuxDebRpmCommand = `elastic-agent enroll ${enrollArgs}
systemctl enable elastic-agent
systemctl start elastic-agent`;

  const windowsCommand = `.\\elastic-agent enroll ${enrollArgs}
.\\install-service-elastic-agent.ps1`;

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.ingestManager.enrollmentInstructions.descriptionText"
          defaultMessage="From the agent directory, run these commands to enroll and start an Elastic Agent. You can reuse these commands to set up agents on more than one host. Requires administrator privileges."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ingestManager.enrollmentInstructions.windowsTitle"
            defaultMessage="Windows"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
        <CommandCode>{windowsCommand}</CommandCode>
      </EuiCodeBlock>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ingestManager.enrollmentInstructions.linuxDebRpmTitle"
            defaultMessage="Linux (.deb and .rpm)"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
        <CommandCode>{linuxDebRpmCommand}</CommandCode>
      </EuiCodeBlock>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ingestManager.enrollmentInstructions.macLinuxTarTitle"
            defaultMessage="macOS / Linux (.tar.gz)"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable={true} paddingSize="m">
        <CommandCode>{macOsLinuxTarCommand}</CommandCode>
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.ingestManager.enrollmentInstructions.macLinuxTarInstructions"
          defaultMessage="The {command} command runs the agent in the foreground. If the agent's host reboots, you'll need to run the command again."
          values={{
            command: <EuiCode>./elastic-agent run</EuiCode>,
          }}
        />
      </EuiText>
    </>
  );
};

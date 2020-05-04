/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import {
  EuiCopy,
  EuiCodeBlock,
  EuiCode,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { EnrollmentAPIKey } from '../../../types';

interface Props {
  kibanaUrl: string;
  kibanaCASha256?: string;
  apiKey: EnrollmentAPIKey;
  platform: string;
}

export const QuickSetupInstructions: React.FunctionComponent<Props> = ({
  kibanaUrl,
  kibanaCASha256,
  apiKey,
  platform,
}) => {
  // Build quick installation command
  const quickInstallInstructions = `${
    kibanaCASha256 ? `CA_SHA256=${kibanaCASha256} \\\n` : ''
  }API_KEY=${
    apiKey.api_key
  } \\\nsh -c "$(curl ${kibanaUrl}/api/ingest_manager/fleet/install/${platform})"`;

  if (platform === 'windows') {
    const command = `./elastic-agent enroll ${kibanaUrl} ${apiKey.api_key}
./elastic-agent run`;

    return (
      <EuiText>
        <FormattedMessage
          id="xpack.ingestManager.quickSetupInstructions.windowsInstruction"
          defaultMessage="1. Download the Elastic agent Windows zip file from the {downloadLink}.{spacer}
          2. Extract the contents of the zip{spacer}
          3. From the agent’s directory, run these commands to enroll and start the Elastic Agent{spacer}
          "
          values={{
            spacer: <EuiSpacer size="s" />,
            downloadLink: (
              <EuiLink href="https://ela.st/download-elastic-agent" target="_blank">
                <FormattedMessage
                  id="xpack.ingestManager.quickSetupInstructions.downloadLink"
                  defaultMessage="download page"
                />
              </EuiLink>
            ),
          }}
        />
        <EuiCodeBlock fontSize="m" paddingSize="s">
          <pre>{command}</pre>
        </EuiCodeBlock>
      </EuiText>
    );
  }

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.ingestManager.quickSetupInstructions.instructionDescription"
          defaultMessage="Run this command on your host to download and enroll an Elastic Agent with the selected agent configuration. You can use this command to setup agents on more than one host."
        />
        <EuiSpacer size="l" />
        <EuiCode>
          <pre>{quickInstallInstructions}</pre>
        </EuiCode>
        <EuiSpacer size="l" />
        <EuiCopy textToCopy={quickInstallInstructions}>
          {copy => (
            <EuiButton onClick={copy} iconType="copy" fill>
              <FormattedMessage
                id="xpack.ingestManager.quickSetupInstructions.copyButton"
                defaultMessage="Copy quick setup command"
              />
            </EuiButton>
          )}
        </EuiCopy>
      </EuiText>
    </>
  );
};

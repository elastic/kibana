/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { EuiCopy, EuiCode, EuiText, EuiSpacer, EuiButton } from '@elastic/eui';
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
    return <p>TODO Special case</p>;
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiCode, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EnrollmentAPIKey } from '../../../types';

interface Props {
  kibanaUrl: string;
  apiKey: EnrollmentAPIKey;
}

export const ManualInstructions: React.FunctionComponent<Props> = ({ kibanaUrl, apiKey }) => {
  const command = `
./elastic-agent enroll ${kibanaUrl} ${apiKey.api_key}
./elastic-agent run`;
  return (
    <>
      <EuiText>
        <FormattedMessage
          id="todo"
          defaultMessage="From the agent’s directory, run these commands to enroll and start the Elastic Agent. {enrollCommand} will write to your agent’s configuration file so that it has the correct settings. You can use this command to setup agents on more than one host."
          values={{
            enrollCommand: <EuiCode>agent enroll</EuiCode>,
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCodeBlock fontSize="m">
        <pre>{command}</pre>
      </EuiCodeBlock>
    </>
  );
};

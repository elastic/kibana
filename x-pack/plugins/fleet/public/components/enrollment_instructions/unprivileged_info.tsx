/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const UnprivilegedInfo: React.FC = () => {
  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.agentEnrollmentFlyout.unprivilegedMessage"
            defaultMessage="To install Elastic Agent without root privileges, add the {flag} flag to the {command} install command below."
            values={{
              flag: <EuiCode>--unprivileged</EuiCode>,
              command: <EuiCode>sudo ./elastic-agent</EuiCode>,
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const InstallationMessage: React.FunctionComponent = () => {
  return (
    <EuiText>
      <FormattedMessage
        id="xpack.fleet.enrollmentInstructions.installationMessage"
        defaultMessage="Select the appropriate platform and run commands to install, enroll, and start Elastic Agent. Reuse commands to set up agents on more than one host. For aarch64, see our {downloadLink}. For additional guidance, see our {installationLink}."
        values={{
          downloadLink: (
            <EuiLink target="_blank" external href="https://ela.st/download-elastic-agent">
              <FormattedMessage
                id="xpack.fleet.enrollmentInstructions.downloadLink"
                defaultMessage="downloads page"
              />
            </EuiLink>
          ),
          installationLink: (
            <EuiLink target="_blank" external href="">
              <FormattedMessage
                id="xpack.fleet.enrollmentInstructions.installationMessage.link"
                defaultMessage="installation docs"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
};

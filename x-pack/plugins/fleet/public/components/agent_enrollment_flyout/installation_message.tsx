/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';
import semverPatch from 'semver/functions/patch';

import { useKibanaVersion } from '../../hooks';

export const InstallationMessage: React.FunctionComponent = () => {
  const kibanaVersion = useKibanaVersion();
  const kibanaVersionURLString = useMemo(
    () =>
      `${semverMajor(kibanaVersion)}-${semverMinor(kibanaVersion)}-${semverPatch(kibanaVersion)}`,
    [kibanaVersion]
  );

  return (
    <EuiText>
      <FormattedMessage
        id="xpack.fleet.enrollmentInstructions.installationMessage"
        defaultMessage="Select the appropriate platform and run commands to install, enroll, and start Elastic Agent. Reuse commands to set up agents on more than one host. For aarch64, see our {downloadLink}. For additional guidance, see our {installationLink}."
        values={{
          downloadLink: (
            <EuiLink
              target="_blank"
              external
              href={`https://www.elastic.co/downloads/past-releases/elastic-agent-${kibanaVersionURLString}`}
            >
              <FormattedMessage
                id="xpack.fleet.enrollmentInstructions.downloadLink"
                defaultMessage="downloads page"
              />
            </EuiLink>
          ),
          installationLink: (
            <EuiLink
              target="_blank"
              external
              href="https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html"
            >
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocumentationLinksService } from '../../documentation_links';

interface Props {
  docLinks: DocumentationLinksService;
}

export const NoCompatibleRealms: React.FunctionComponent<Props> = ({ docLinks }: Props) => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.security.management.roleMappings.noCompatibleRealmsErrorTitle"
        defaultMessage="No compatible realms are enabled in Elasticsearch"
      />
    }
    color="warning"
    iconType="alert"
  >
    <FormattedMessage
      id="xpack.security.management.roleMappings.noCompatibleRealmsErrorDescription"
      defaultMessage="Role mappings will not be applied to any users. Contact your system administrator and refer to the {link} for more information."
      values={{
        link: (
          <EuiLink href={docLinks.getRoleMappingDocUrl()} external={true} target="_blank">
            <FormattedMessage
              id="xpack.security.management.roleMappings.noCompatibleRealmsErrorLinkText"
              defaultMessage="docs"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);

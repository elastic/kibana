/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export const NoCompatibleRealms: React.FunctionComponent = () => {
  const docLinks = useKibana().services.docLinks!;
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.security.management.roleMappings.noCompatibleRealmsErrorTitle"
          defaultMessage="No compatible realms appear to be enabled in Elasticsearch"
        />
      }
      color="warning"
      iconType="alert"
    >
      <FormattedMessage
        id="xpack.security.management.roleMappings.noCompatibleRealmsErrorDescription"
        defaultMessage="Role mappings may not be applied to users. Contact your system administrator and refer to the {link} for more information."
        values={{
          link: (
            <EuiLink href={docLinks.links.security.mappingRoles} external target="_blank">
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
};

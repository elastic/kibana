/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { capabilities } from 'ui/capabilities';

export const SecureSpaceMessage = ({}) => {
  if (capabilities.get().spaces.manage) {
    const rolesLinkTextAriaLabel = i18n.translate(
      'xpack.spaces.management.secureSpaceMessage.rolesLinkTextAriaLabel',
      { defaultMessage: 'Roles management page' }
    );
    return (
      <Fragment>
        <EuiHorizontalRule />
        <EuiText className="eui-textCenter">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.secureSpaceMessage.howToAssignRoleToSpaceDescription"
              defaultMessage="Want to assign a role to a space? Go to {rolesLink}."
              values={{
                rolesLink: (
                  <EuiLink href="#/management/security/roles" aria-label={rolesLinkTextAriaLabel}>
                    <FormattedMessage
                      id="xpack.spaces.management.secureSpaceMessage.rolesLinkText"
                      defaultMessage="Roles"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </Fragment>
    );
  }
  return null;
};

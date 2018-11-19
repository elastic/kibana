/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { UserProfile } from 'plugins/xpack_main/services/user_profile';
import React, { Fragment } from 'react';

interface Props {
  userProfile: UserProfile;
}

export const SecureSpaceMessage = (props: Props) => {
  if (props.userProfile.hasCapability('manageSecurity')) {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiText className="eui-textCenter">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.secureSpaceMessage.howToAssignRoleToSpaceDescription"
              defaultMessage="Want to assign a role to a space? Go to Management and select {rolesLink}."
              values={{
                rolesLink: (
                  <EuiLink href="#/management/security/roles">
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

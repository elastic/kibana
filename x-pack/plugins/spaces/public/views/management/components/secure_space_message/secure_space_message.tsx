/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React, { Fragment } from 'react';
import { uiCapabilities } from 'ui/capabilities';

export const SecureSpaceMessage = ({}) => {
  if (uiCapabilities.spaces.manage) {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiText className="eui-textCenter">
          <p>
            Want to assign a role to a space? Go to Management and select{' '}
            <EuiLink href="#/management/security/roles">Roles</EuiLink>.
          </p>
        </EuiText>
      </Fragment>
    );
  }
  return null;
};

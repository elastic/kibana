/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

interface MissingPrivilegesProps {
  connectorsRequired?: boolean;
}

export const MissingPrivileges = React.memo<MissingPrivilegesProps>(
  ({ connectorsRequired = false }) => {
    return (
      <EuiCallOut title={i18n.PRIVILEGES_MISSING_TITLE} iconType="iInCircle">
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem>{i18n.PRIVILEGES_MISSING_DESCRIPTION}</EuiFlexItem>
          <EuiFlexItem>{i18n.PRIVILEGES_NEEDED_TITLE}</EuiFlexItem>
          <EuiFlexItem>
            <ul>
              <li>
                <EuiCode>{i18n.REQUIRED_PRIVILEGES.FLEET}</EuiCode>
              </li>
              <li>
                <EuiCode>{i18n.REQUIRED_PRIVILEGES.INTEGRATIONS}</EuiCode>
              </li>
              {connectorsRequired && (
                <li>
                  <EuiCode>{i18n.REQUIRED_PRIVILEGES.CONNECTORS}</EuiCode>
                </li>
              )}
            </ul>
          </EuiFlexItem>
          <EuiFlexItem>{i18n.CONTACT_ADMINISTRATOR}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
);
MissingPrivileges.displayName = 'MissingPrivileges';

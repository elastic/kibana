/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

interface MissingPrivilegesTooltip {
  children: React.ReactElement; // EuiToolTip requires a single ReactElement child
}

export const MissingPrivilegesTooltip = React.memo<MissingPrivilegesTooltip>(({ children }) => (
  <EuiToolTip
    anchorProps={{ style: { width: 'fit-content' } }}
    title={i18n.PRIVILEGES_MISSING_TITLE}
    content={<MissingPrivilegesDescription />}
  >
    {children}
  </EuiToolTip>
));
MissingPrivilegesTooltip.displayName = 'MissingPrivilegesTooltip';

export const MissingPrivilegesDescription = React.memo(() => {
  return (
    <EuiFlexGroup gutterSize="m" direction="column" data-test-subj="missingPrivilegesGroup">
      <EuiFlexItem>{i18n.PRIVILEGES_REQUIRED_TITLE}</EuiFlexItem>
      <EuiFlexItem>
        <EuiCode>
          <ul>
            <li>{i18n.REQUIRED_PRIVILEGES_CONNECTORS_ALL}</li>
          </ul>
        </EuiCode>
      </EuiFlexItem>
      <EuiFlexItem>{i18n.CONTACT_ADMINISTRATOR}</EuiFlexItem>
    </EuiFlexGroup>
  );
});
MissingPrivilegesDescription.displayName = 'MissingPrivilegesDescription';

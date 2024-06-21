/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Authorization } from '../../hooks/use_authorization';
import * as i18n from './translations';
import { Page } from '../../constants';

type AuthDescriptionProps = Partial<Authorization>;
export const AuthDescription = React.memo<AuthDescriptionProps>((authRequired) => {
  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>{i18n.PRIVILEGES_REQUIRED_TITLE}</EuiFlexItem>
      <EuiFlexItem>
        <ul>
          {authRequired.canCreateIntegrations && (
            <>
              <li>
                <EuiCode>{i18n.REQUIRED_PRIVILEGES.FLEET_ALL}</EuiCode>
              </li>
              <li>
                <EuiCode>{i18n.REQUIRED_PRIVILEGES.INTEGRATIONS_ALL}</EuiCode>
              </li>
            </>
          )}
          {authRequired.canCreateConnectors ? (
            <li>
              <EuiCode>{i18n.REQUIRED_PRIVILEGES.CONNECTORS_ALL}</EuiCode>
            </li>
          ) : (
            <>
              {authRequired.canExecuteConnectors && (
                <li>
                  <EuiCode>{i18n.REQUIRED_PRIVILEGES.CONNECTORS_READ}</EuiCode>
                </li>
              )}
            </>
          )}
        </ul>
      </EuiFlexItem>
      <EuiFlexItem>{i18n.CONTACT_ADMINISTRATOR}</EuiFlexItem>
    </EuiFlexGroup>
  );
});
AuthDescription.displayName = 'AuthDescription';

interface PageAuthDescriptionProps {
  page: Page;
}
export const PageAuthDescription = React.memo<PageAuthDescriptionProps>(({ page }) => (
  <AuthDescription canCreateIntegrations canExecuteConnectors={page === Page.assistant} />
));
PageAuthDescription.displayName = 'PageAuthDescription';

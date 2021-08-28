/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { HelpMenu } from '../components/help_menu/help_menu';
import { NavigationMenu } from '../components/navigation_menu/navigation_menu';
import { useMlKibana } from '../contexts/kibana/kibana_context';

export const Page = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;
  return (
    <>
      <NavigationMenu tabId="access-denied" />
      <EuiSpacer size="xxl" />
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
            <EuiEmptyPrompt
              iconType="alert"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.ml.management.jobsList.accessDeniedTitle"
                    defaultMessage="Access denied"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.ml.accessDenied.description"
                    defaultMessage="You don’t have permission to view the Machine Learning plugin. Access to the plugin requires the Machine Learning feature to be visible in this space."
                  />
                </p>
              }
            />
          </EuiPageContent>
        </EuiFlexItem>
      </EuiFlexGroup>
      <HelpMenu docLink={helpLink} />
    </>
  );
};

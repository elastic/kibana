/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { FormattedMessage, injectI18nProvider } from '@kbn/i18n/react';

import { UpgradeCheckupTabs } from './components/tabs';

export class RootComponentUI extends React.Component {
  public render() {
    return (
      <EuiPage restrictWidth data-test-subj="upgradeCheckupRoot">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle size="l">
                <h1>
                  {/* TODO: pull version from the code */}
                  <FormattedMessage
                    id="xpack.upgradeCheckup.appTitle"
                    defaultMessage="{version} Upgrade Assistant"
                    values={{ version: '7.0' }}
                  />
                </h1>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <UpgradeCheckupTabs />
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const RootComponent = injectI18nProvider(RootComponentUI);

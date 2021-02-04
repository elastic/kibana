/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nStart } from 'src/core/public';
import { EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { UpgradeAssistantTabs } from './components/tabs';
import { AppContextProvider, ContextValue, AppContext } from './app_context';

export interface AppDependencies extends ContextValue {
  i18n: I18nStart;
}

export const RootComponent = ({ i18n, ...contextValue }: AppDependencies) => {
  const { nextMajor } = contextValue.kibanaVersionInfo;
  return (
    <i18n.Context>
      <AppContextProvider value={contextValue}>
        <div data-test-subj="upgradeAssistantRoot">
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle size="l">
                <h1>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.appTitle"
                    defaultMessage="{version} Upgrade Assistant"
                    values={{ version: `${nextMajor}.0` }}
                  />
                </h1>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <AppContext.Consumer>
            {({ http }) => <UpgradeAssistantTabs http={http} />}
          </AppContext.Consumer>
        </div>
      </AppContextProvider>
    </i18n.Context>
  );
};

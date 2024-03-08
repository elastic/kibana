/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { Chat } from './chat';
import { PlaygroundProvider } from '../providers/playground_provider';
import { PLUGIN_ID, PLUGIN_NAME } from '../../common';

interface SearchPlaygroundAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const SearchPlaygroundApp = ({
  basename,
  notifications,
  http,
  navigation,
}: SearchPlaygroundAppDeps) => {
  return (
    <Router basename={basename}>
      <PlaygroundProvider navigateToIndexPage={() => {}}>
        <I18nProvider>
          <>
            <navigation.ui.TopNavMenu appName={PLUGIN_ID} />
            <EuiPageTemplate>
              <EuiPageTemplate.Header>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="searchPlayground.helloWorldText"
                      defaultMessage="{name}"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageTemplate.Header>
              <EuiPageTemplate.Section
                alignment="top"
                restrictWidth={false}
                grow
                contentProps={{ css: { display: 'flex', flexGrow: 1 } }}
                paddingSize="none"
              >
                <Chat />
              </EuiPageTemplate.Section>
            </EuiPageTemplate>
          </>
        </I18nProvider>
      </PlaygroundProvider>
    </Router>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { i18n } from '@kbn/i18n';
import { Chat } from './chat';
import { PlaygroundProvider } from '../providers/playground_provider';
import { PLUGIN_ID } from '../../common';

interface SearchPlaygroundAppDeps {
  navigation: NavigationPublicPluginStart;
}

export const SearchPlaygroundApp = ({ navigation }: SearchPlaygroundAppDeps) => {
  return (
    <PlaygroundProvider navigateToIndexPage={() => {}}>
      <navigation.ui.TopNavMenu appName={PLUGIN_ID} />

      <KibanaPageTemplate
        pageChrome={[
          i18n.translate('searchPlayground.breadcrumb', {
            defaultMessage: 'Playground',
          }),
        ]}
        pageHeader={{
          pageTitle: i18n.translate('searchPlayground.pageTitle', {
            defaultMessage: 'Playground',
          }),
        }}
        bottomBorder="extended"
        restrictWidth={false}
      >
        <KibanaPageTemplate.Section
          alignment="top"
          restrictWidth={false}
          grow
          contentProps={{ css: { display: 'flex', flexGrow: 1 } }}
          paddingSize="none"
        >
          <Chat />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </PlaygroundProvider>
  );
};

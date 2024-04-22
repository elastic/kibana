/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { PlaygroundProvider } from './providers/playground_provider';

import { App } from './components/app';
import { PlaygroundToolbar } from './embeddable';

export const ChatPlaygroundOverview: React.FC = () => {
  return (
    <PlaygroundProvider
      defaultValues={{
        indices: [],
      }}
    >
      <KibanaPageTemplate
        pageChrome={[
          i18n.translate('xpack.searchPlayground.breadcrumb', {
            defaultMessage: 'Playground',
          }),
        ]}
        pageHeader={{
          pageTitle: i18n.translate('xpack.searchPlayground.pageTitle', {
            defaultMessage: 'Playground',
          }),
          rightSideItems: [<PlaygroundToolbar />],
        }}
        pageViewTelemetry="Playground"
        data-test-subj="svlPlaygroundPage"
        bottomBorder="extended"
        restrictWidth
      >
        <App />
      </KibanaPageTemplate>
    </PlaygroundProvider>
  );
};

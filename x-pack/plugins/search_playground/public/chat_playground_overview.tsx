/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PlaygroundProvider } from './providers/playground_provider';

import { App } from './components/app';
import { PlaygroundToolbar } from './embeddable';
import { PlaygroundHeaderDocs } from './components/playground_header_docs';

export const ChatPlaygroundOverview: React.FC = () => {
  return (
    <PlaygroundProvider>
      <EuiPageTemplate
        offset={0}
        restrictWidth={false}
        data-test-subj="svlPlaygroundPage"
        grow={false}
      >
        <EuiPageTemplate.Header
          pageTitle={
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <span data-test-subj="chat-playground-home-page-title">
                  <FormattedMessage
                    id="xpack.searchPlayground.pageTitle"
                    defaultMessage="Playground"
                  />
                </span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate('xpack.searchPlayground.pageTitle.techPreview', {
                    defaultMessage: 'TECH PREVIEW',
                  })}
                  color="hollow"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          data-test-subj="chat-playground-home-page"
          rightSideItems={[<PlaygroundHeaderDocs />, <PlaygroundToolbar />]}
        />
        <App />
      </EuiPageTemplate>
    </PlaygroundProvider>
  );
};

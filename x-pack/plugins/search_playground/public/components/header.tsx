/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Toolbar } from './toolbar';
import { PlaygroundHeaderDocs } from './playground_header_docs';

interface HeaderProps {
  showDocs?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showDocs = false }) => {
  const sideItems = showDocs ? [<PlaygroundHeaderDocs />, <Toolbar />] : [<Toolbar />];

  return (
    <EuiPageTemplate.Header
      css={{ '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' } }}
      pageTitle={
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiTitle
              css={{ whiteSpace: 'nowrap' }}
              data-test-subj="chat-playground-home-page-title"
            >
              <h2>
                <FormattedMessage
                  id="xpack.searchPlayground.pageTitle"
                  defaultMessage="Playground"
                />
              </h2>
            </EuiTitle>
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
      rightSideItems={sideItems}
    />
  );
};

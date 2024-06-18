/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PlaygroundHeaderDocs } from './playground_header_docs';
import { Toolbar } from './toolbar';

interface HeaderProps {
  showDocs?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showDocs = false }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPageTemplate.Header
      css={{
        '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' },
        backgroundColor: euiTheme.colors.ghost,
      }}
      paddingSize="s"
      data-test-subj="chat-playground-home-page"
    >
      <EuiPageHeaderSection>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiTitle
            css={{ whiteSpace: 'nowrap' }}
            data-test-subj="chat-playground-home-page-title"
            size="xs"
          >
            <h2>
              <FormattedMessage id="xpack.searchPlayground.pageTitle" defaultMessage="Playground" />
            </h2>
          </EuiTitle>
          <EuiBetaBadge
            label={i18n.translate('xpack.searchPlayground.pageTitle.techPreview', {
              defaultMessage: 'TECH PREVIEW',
            })}
            color="hollow"
            alignment="middle"
          />
        </EuiFlexGroup>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiFlexGroup alignItems="center">
          <Toolbar />
          {showDocs && <PlaygroundHeaderDocs />}
        </EuiFlexGroup>
      </EuiPageHeaderSection>
    </EuiPageTemplate.Header>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButtonGroup,
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
import { ViewMode } from './app';

interface HeaderProps {
  showDocs?: boolean;
  selectedMode: string;
  onModeChange: (mode: string) => void;
  isActionsDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMode,
  onModeChange,
  showDocs = false,
  isActionsDisabled = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const options = [
    {
      id: ViewMode.chat,
      label: i18n.translate('xpack.searchPlayground.header.view.chat', {
        defaultMessage: 'Chat',
      }),
      'data-test-subj': 'chatMode',
    },
    {
      id: ViewMode.query,
      label: i18n.translate('xpack.searchPlayground.header.view.query', {
        defaultMessage: 'Query',
      }),
      'data-test-subj': 'queryMode',
    },
  ];

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
        <EuiButtonGroup
          legend="viewMode"
          options={options}
          idSelected={selectedMode}
          onChange={onModeChange}
          buttonSize="compressed"
          isDisabled={isActionsDisabled}
          data-test-subj="viewModeSelector"
        />
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiFlexGroup alignItems="center">
          {showDocs && <PlaygroundHeaderDocs />}
          <Toolbar />
        </EuiFlexGroup>
      </EuiPageHeaderSection>
    </EuiPageTemplate.Header>
  );
};

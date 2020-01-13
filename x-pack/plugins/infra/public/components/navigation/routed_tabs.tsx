/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge, EuiLink, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Route } from 'react-router-dom';

import euiStyled from '../../../../../common/eui_styled_components';

interface TabConfiguration {
  title: string | React.ReactNode;
  path: string;
}

interface RoutedTabsProps {
  tabs: TabConfiguration[];
}

const noop = () => {};

export class RoutedTabs extends React.Component<RoutedTabsProps> {
  public render() {
    return <EuiTabs display="condensed">{this.renderTabs()}</EuiTabs>;
  }

  private renderTabs() {
    return this.props.tabs.map(tab => {
      return (
        <Route
          key={`${tab.path}-${tab.title}`}
          path={tab.path}
          children={({ match, history }) => (
            <TabContainer className="euiTab">
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiLink
                href={`#${tab.path}`}
                data-test-subj={`infrastructureNavLink_${tab.path}`}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  history.push(tab.path);
                }}
              >
                <EuiTab onClick={noop} isSelected={match !== null}>
                  {tab.title}
                </EuiTab>
              </EuiLink>
            </TabContainer>
          )}
        />
      );
    });
  }
}

const tabBetaBadgeLabel = i18n.translate('xpack.infra.common.tabBetaBadgeLabel', {
  defaultMessage: 'Beta',
});

const tabBetaBadgeTooltipContent = i18n.translate('xpack.infra.common.tabBetaBadgeTooltipContent', {
  defaultMessage:
    'This feature is under active development. Extra functionality is coming, and some functionality may change.',
});

export const TabBetaBadge = euiStyled(EuiBetaBadge).attrs({
  'aria-label': tabBetaBadgeLabel,
  label: tabBetaBadgeLabel,
  tooltipContent: tabBetaBadgeTooltipContent,
})`
  margin-left: 4px;
  vertical-align: baseline;
`;

const TabContainer = euiStyled.div`
  .euiLink {
    color: inherit !important;
  }
`;

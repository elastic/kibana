/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { useRouterNavigate } from '../common/lib/kibana';
import { ManageIntegrationLink } from './manage_integration_link';
import { Nav } from './layouts';

enum Section {
  LiveQueries = 'live_queries',
  Packs = 'packs',
  SavedQueries = 'saved_queries',
}

export const MainNavigation = () => {
  const location = useLocation();
  const section = useMemo(() => location.pathname.split('/')[1] ?? 'overview', [location.pathname]);
  return (
    <Nav>
      <EuiFlexGroup gutterSize="l" alignItems="center">
        <EuiFlexItem>
          <EuiTabs display="condensed">
            <EuiTab
              isSelected={section === Section.LiveQueries}
              {...useRouterNavigate(Section.LiveQueries)}
            >
              <FormattedMessage
                id="xpack.osquery.appNavigation.liveQueriesLinkText"
                defaultMessage="Live queries"
              />
            </EuiTab>
            <EuiTab isSelected={section === Section.Packs} {...useRouterNavigate(Section.Packs)}>
              <FormattedMessage
                id="xpack.osquery.appNavigation.packsLinkText"
                defaultMessage="Packs"
              />
            </EuiTab>
            <EuiTab
              isSelected={section === Section.SavedQueries}
              {...useRouterNavigate(Section.SavedQueries)}
            >
              <FormattedMessage
                id="xpack.osquery.appNavigation.savedQueriesLinkText"
                defaultMessage="Saved queries"
              />
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" direction="row">
            <EuiFlexItem>
              <EuiButtonEmpty
                iconType="popout"
                href="https://ela.st/osquery-feedback"
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.osquery.appNavigation.sendFeedbackButton"
                  defaultMessage="Send feedback"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <ManageIntegrationLink />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Nav>
  );
};

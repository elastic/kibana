/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { useLocation } from 'react-router-dom';

import { Container, Nav, Wrapper } from './layouts';
import { OsqueryAppRoutes } from '../routes';
import { useRouterNavigate } from '../common/lib/kibana';
import { ManageIntegrationLink } from './manage_integration_link';

const OsqueryAppComponent = () => {
  const location = useLocation();
  const section = useMemo(() => location.pathname.split('/')[1] ?? 'overview', [location.pathname]);

  return (
    <Container>
      <Wrapper>
        <Nav>
          <EuiFlexGroup gutterSize="l" alignItems="center">
            <EuiFlexItem>
              <EuiTabs display="condensed">
                {/* <EuiTab isSelected={section === 'overview'} {...useRouterNavigate('overview')}>
                  <FormattedMessage
                    id="xpack.osquery.appNavigation.overviewLinkText"
                    defaultMessage="Overview"
                  />
                </EuiTab> */}
                <EuiTab
                  isSelected={section === 'live_queries'}
                  {...useRouterNavigate('live_queries')}
                >
                  <FormattedMessage
                    id="xpack.osquery.appNavigation.liveQueriesLinkText"
                    defaultMessage="Live queries"
                  />
                </EuiTab>
                <EuiTab
                  isSelected={section === 'scheduled_query_groups'}
                  {...useRouterNavigate('scheduled_query_groups')}
                >
                  <FormattedMessage
                    id="xpack.osquery.appNavigation.scheduledQueryGroupsLinkText"
                    defaultMessage="Scheduled query groups"
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
        <OsqueryAppRoutes />
      </Wrapper>
    </Container>
  );
};

export const OsqueryApp = React.memo(OsqueryAppComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { useLocation } from 'react-router-dom';

import { Container, Nav, Wrapper } from './layouts';
import { OsqueryAppRoutes } from '../routes';
import { useRouterNavigate } from '../common/lib/kibana';

export const OsqueryAppComponent = () => {
  const location = useLocation();
  const section = useMemo(() => location.pathname.split('/')[1] ?? 'overview', [location.pathname]);

  return (
    <Container>
      <Wrapper>
        <Nav>
          <EuiFlexGroup gutterSize="l" alignItems="center">
            <EuiFlexItem>
              <EuiTabs display="condensed">
                <EuiTab isSelected={section === 'overview'} {...useRouterNavigate('overview')}>
                  <FormattedMessage
                    id="xpack.osquery.appNavigation.overviewLinkText"
                    defaultMessage="Overview"
                  />
                </EuiTab>
                <EuiTab isSelected={section === 'live_query'} {...useRouterNavigate('live_query')}>
                  <FormattedMessage
                    id="xpack.osquery.appNavigation.liveQueryLinkText"
                    defaultMessage="Live Query"
                  />
                </EuiTab>
              </EuiTabs>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Nav>
        <OsqueryAppRoutes />
      </Wrapper>
    </Container>
  );
};

export const OsqueryApp = React.memo(OsqueryAppComponent);

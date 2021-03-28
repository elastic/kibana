/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';

import { GetPackagesResponse, EPM_API_ROUTES } from '../../../fleet/common';

import { Container, Nav, Wrapper } from './layouts';
import { OsqueryAppRoutes } from '../routes';
import { useKibana, useRouterNavigate } from '../common/lib/kibana';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const OsqueryAppComponent = () => {
  const {
    application: { getUrlForApp },
    http,
  } = useKibana().services;
  const location = useLocation();
  const section = useMemo(() => location.pathname.split('/')[1] ?? 'overview', [location.pathname]);

  const { data: integrationUrl } = useQuery(
    'integrations',
    () =>
      http.get(EPM_API_ROUTES.LIST_PATTERN, {
        query: {
          experimental: true,
        },
      }),
    {
      select: ({ response }: GetPackagesResponse) => {
        const osqueryIntegration = find(['name', OSQUERY_INTEGRATION_NAME], response);

        if (!osqueryIntegration) return null;

        return getUrlForApp('fleet', {
          path: `#/integrations/detail/${osqueryIntegration.name}-${osqueryIntegration.version}/`,
        });
      },
    }
  );

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
                <EuiTab
                  isSelected={section === 'scheduled_queries'}
                  {...useRouterNavigate('scheduled_queries')}
                >
                  <FormattedMessage
                    id="xpack.osquery.appNavigation.scheduledQueriesLinkText"
                    defaultMessage="Scheduled Queries"
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
                {integrationUrl && (
                  <EuiFlexItem>
                    <EuiButtonEmpty iconType="gear" href={integrationUrl} target="_blank">
                      <FormattedMessage
                        id="xpack.osquery.appNavigation.manageIntegrationButton"
                        defaultMessage="Manage integration"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
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

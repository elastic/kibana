/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore: EuiBreadcrumbs has no exported member
  EuiBreadcrumbs,
  EuiFlexGroup,
} from '@elastic/eui';

import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { ESTermQuery } from '../../../common/typed_json';
import { EmptyPage } from '../../components/empty_page';
import { getHostsUrl, HostComponentProps } from '../../components/link_to/redirect_to_hosts';
import { HostSummary } from '../../components/page/hosts/host_summary';
import { manageQuery } from '../../components/page/manage_query';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { HostSummaryQuery } from '../../containers/hosts/host_summary.gql_query';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const HostSummaryManage = manageQuery(HostSummary);

export const HostDetails = pure<HostComponentProps>(({ match: { params: { hostId } } }) => (
  <WithSource sourceId="default">
    {({ auditbeatIndicesExist }) =>
      indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) ? (
        <GlobalTime>
          {({ poll, to, from, setQuery }) => (
            <>
              <HostBreadcrumbWrapper breadcrumbs={getBreadcrumbs(hostId)} />

              <EuiFlexGroup>
                <HostsQuery
                  sourceId="default"
                  query={HostSummaryQuery}
                  startDate={from}
                  endDate={to}
                  poll={poll}
                  filterQuery={getFilterQuery(hostId)}
                >
                  {({ hosts, loading, id, refetch, startDate, endDate }) => (
                    <HostSummaryManage
                      id={id}
                      refetch={refetch}
                      setQuery={setQuery}
                      startDate={startDate}
                      endDate={endDate}
                      data={hosts}
                      loading={loading}
                    />
                  )}
                </HostsQuery>
              </EuiFlexGroup>
            </>
          )}
        </GlobalTime>
      ) : (
        <EmptyPage
          title={i18n.NO_AUDITBEAT_INDICES}
          message={i18n.LETS_ADD_SOME}
          actionLabel={i18n.SETUP_INSTRUCTIONS}
          actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/security`}
        />
      )
    }
  </WithSource>
));

const getBreadcrumbs = (hostId: string) => [
  {
    text: i18n.HOSTS,
    href: getHostsUrl(),
  },
  {
    text: hostId,
  },
];

const getFilterQuery = (hostId: string): ESTermQuery => ({ term: { 'host.id': hostId } });

const HostBreadcrumbWrapper = styled(EuiBreadcrumbs)`
  margin: 10px 0;
`;

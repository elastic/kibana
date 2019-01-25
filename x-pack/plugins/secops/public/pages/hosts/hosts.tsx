/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
} from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { AutocompleteField } from '../../components/autocomplete_field';
import { EmptyPage } from '../../components/empty_page';
import {
  EventsTable,
  HostsTable,
  TypesBar,
  UncommonProcessTable,
} from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsFilter, HostsQuery } from '../../containers/hosts';
import { HostsTableQuery } from '../../containers/hosts/hosts_table.gql_query';
import { KpiEventsQuery } from '../../containers/kpi_events';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { KpiItem } from '../../graphql/types';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);
const TypesBarManage = manageQuery(TypesBar);

export const Hosts = pure(() => (
  <WithSource sourceId="default">
    {({ auditbeatIndicesExist, indexPattern }) =>
      indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) ? (
        <>
          <PageContentHeader data-test-subj="paneHeader">
            <PageContentHeaderSection>
              <KueryAutocompletion indexPattern={indexPattern}>
                {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
                  <HostsFilter indexPattern={indexPattern}>
                    {({
                      applyFilterQueryFromKueryExpression,
                      filterQueryDraft,
                      isFilterQueryDraftValid,
                      setFilterQueryDraftFromKueryExpression,
                    }) => (
                      <AutocompleteField
                        isLoadingSuggestions={isLoadingSuggestions}
                        isValid={isFilterQueryDraftValid}
                        loadSuggestions={loadSuggestions}
                        onChange={setFilterQueryDraftFromKueryExpression}
                        onSubmit={applyFilterQueryFromKueryExpression}
                        placeholder={i18n.KQL_PACE_HOLDER}
                        suggestions={suggestions}
                        value={filterQueryDraft ? filterQueryDraft.expression : ''}
                      />
                    )}
                  </HostsFilter>
                )}
              </KueryAutocompletion>
            </PageContentHeaderSection>
          </PageContentHeader>
          <PageContentBody data-test-subj="pane1ScrollContainer">
            <GlobalTime>
              {({ poll, to, from, setQuery }) => (
                <>
                  <KpiEventsQuery sourceId="default" startDate={from} endDate={to} poll={poll}>
                    {({ kpiEventType, loading, id, refetch }) => (
                      <TypesBarManage
                        id={id}
                        refetch={refetch}
                        setQuery={setQuery}
                        loading={loading}
                        data={kpiEventType!.map((i: KpiItem) => ({
                          x: i.count,
                          y: i.value,
                        }))}
                      />
                    )}
                  </KpiEventsQuery>
                  <HostsQuery
                    query={HostsTableQuery}
                    sourceId="default"
                    startDate={from}
                    endDate={to}
                    poll={poll}
                  >
                    {({ hosts, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
                      <HostsTableManage
                        id={id}
                        refetch={refetch}
                        setQuery={setQuery}
                        loading={loading}
                        data={hosts}
                        totalCount={totalCount}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                        loadMore={loadMore}
                      />
                    )}
                  </HostsQuery>
                  <UncommonProcessesQuery
                    sourceId="default"
                    startDate={from}
                    endDate={to}
                    poll={poll}
                    cursor={null}
                  >
                    {({
                      uncommonProcesses,
                      totalCount,
                      loading,
                      pageInfo,
                      loadMore,
                      id,
                      refetch,
                    }) => (
                      <UncommonProcessTableManage
                        id={id}
                        refetch={refetch}
                        setQuery={setQuery}
                        loading={loading}
                        startDate={from}
                        data={uncommonProcesses}
                        totalCount={totalCount}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loadMore={loadMore}
                      />
                    )}
                  </UncommonProcessesQuery>
                  <AuthenticationsQuery
                    sourceId="default"
                    startDate={from}
                    endDate={to}
                    poll={poll}
                  >
                    {({
                      authentications,
                      totalCount,
                      loading,
                      pageInfo,
                      loadMore,
                      id,
                      refetch,
                    }) => (
                      <AuthenticationTableManage
                        id={id}
                        refetch={refetch}
                        setQuery={setQuery}
                        loading={loading}
                        startDate={from}
                        data={authentications}
                        totalCount={totalCount}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loadMore={loadMore}
                      />
                    )}
                  </AuthenticationsQuery>
                  <EventsQuery sourceId="default" startDate={from} endDate={to} poll={poll}>
                    {({ events, loading, id, refetch, totalCount, pageInfo, loadMore }) => (
                      <EventsTableManage
                        id={id}
                        refetch={refetch}
                        setQuery={setQuery}
                        data={events!}
                        loading={loading}
                        startDate={from}
                        totalCount={totalCount}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                        tiebreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loadMore={loadMore}
                      />
                    )}
                  </EventsQuery>
                </>
              )}
            </GlobalTime>
          </PageContentBody>
        </>
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

const PageContentHeader = styled(EuiPageContentHeader)`
  padding: 12px;
  position: fixed;
  width: calc(100% - 32px);
  z-index: 1;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  border: 1px solid ${props => props.theme.eui.euiColorLightShade};
  border-radius: 4px;
  border-bottom: 0px solid white;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  margin-left: -1px;
`;

const PageContentHeaderSection = styled(EuiPageContentHeaderSection)`
  width: 100%;
`;

const PageContentBody = styled(EuiPageContentBody)`
  padding: 60px 24px 24px 24px;
`;

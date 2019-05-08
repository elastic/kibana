/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer, Sticky } from 'react-sticky';
import { pure } from 'recompose';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { EventsTable, HostsTable, UncommonProcessTable } from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { manageQuery } from '../../components/page/manage_query';
import { SuperDatePicker } from '../../components/super_date_picker';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { IndexType } from '../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);

interface HostsComponentReduxProps {
  filterQuery: string;
}

type HostsComponentProps = HostsComponentReduxProps;

const paddingTimeline = '70px'; // Temporary until timeline is moved - MichaelMarcialis

const GlobalFilters = styled.aside<{ isSticky?: boolean }>`
  border-bottom: 1px solid transparent;
  box-sizing: content-box;
  margin: 0 -${paddingTimeline} 0 -${euiLightVars.euiSizeL};
  padding: ${euiLightVars.euiSize} ${paddingTimeline} ${euiLightVars.euiSize}
    ${euiLightVars.euiSizeL};
  transition: background 0.3s ease, border-bottom 0.3s ease;

  ${props =>
    props.isSticky &&
    `
      background: ${
        props.theme.darkMode ? euiDarkVars.euiColorEmptyShade : euiLightVars.euiColorEmptyShade
      };
      border-bottom: ${
        props.theme.darkMode ? euiDarkVars.euiBorderThin : euiLightVars.euiBorderThin
      };
      top: 49px !important;
      z-index: 100;
    `}
`;

const HostsComponent = pure<HostsComponentProps>(({ filterQuery }) => (
  <WithSource sourceId="default" indexTypes={[IndexType.AUDITBEAT]}>
    {({ auditbeatIndicesExist, indexPattern }) =>
      indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) ? (
        <StickyContainer>
          <Sticky topOffset={-49}>
            {({ style, isSticky }) => (
              <GlobalFilters isSticky={isSticky} style={style}>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <HostsKql indexPattern={indexPattern} type={hostsModel.HostsType.page} />
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <SuperDatePicker id="global" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </GlobalFilters>
            )}
          </Sticky>

          <EuiSpacer />

          <GlobalTime>
            {({ to, from, setQuery }) => (
              <>
                <HostsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
                >
                  {({ hosts, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
                    <HostsTableManage
                      id={id}
                      indexPattern={indexPattern}
                      refetch={refetch}
                      setQuery={setQuery}
                      loading={loading}
                      data={hosts}
                      totalCount={totalCount}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </HostsQuery>

                <EuiSpacer />

                <UncommonProcessesQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
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
                      data={uncommonProcesses}
                      totalCount={totalCount}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </UncommonProcessesQuery>

                <EuiSpacer />

                <AuthenticationsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
                >
                  {({ authentications, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
                    <AuthenticationTableManage
                      id={id}
                      refetch={refetch}
                      setQuery={setQuery}
                      loading={loading}
                      data={authentications}
                      totalCount={totalCount}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </AuthenticationsQuery>

                <EuiSpacer />

                <EventsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
                >
                  {({ events, loading, id, refetch, totalCount, pageInfo, loadMore }) => (
                    <EventsTableManage
                      id={id}
                      refetch={refetch}
                      setQuery={setQuery}
                      data={events!}
                      loading={loading}
                      totalCount={totalCount}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                      tiebreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </EventsQuery>
              </>
            )}
          </GlobalTime>
        </StickyContainer>
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

const makeMapStateToProps = () => {
  const getHostsFilterQueryAsJson = hostsSelectors.hostsFilterQueryAsJson();
  const mapStateToProps = (state: State) => ({
    filterQuery: getHostsFilterQueryAsJson(state, hostsModel.HostsType.page) || '',
  });
  return mapStateToProps;
};

export const Hosts = connect(makeMapStateToProps)(HostsComponent);

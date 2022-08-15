/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiPanel } from '@elastic/eui';

import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { LastUpdatedAt } from '../../detection_response/utils';
import * as i18n from './translations';
import { useNotableAnomaliesSearchSearch } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { getAnomaliesColumns } from './columns';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import {
  LinkAnchor,
  LinkButton,
  useGetSecuritySolutionLinkProps,
} from '../../../../common/components/links';
import { HostsTableType } from '../../../../hosts/store/model';
import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { SecurityPageName } from '../../../../app/types';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../users/store/model';
import { useKibana } from '../../../../common/lib/kibana';

const TABLE_QUERY_ID = 'entityAnalyticsDashboardAnomaliesTable';

const TABLE_SORTING = {
  sort: {
    field: 'count',
    direction: 'desc',
  },
} as const;

export const EntityAnalyticsAnomalies = () => {
  const {
    services: { ml, http },
  } = useKibana();

  const jobsUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getAnomaliesColumns(), []);
  const { deleteQuery, setQuery, from, to } = useGlobalTime(false);
  const { isLoading, data, refetch } = useNotableAnomaliesSearchSearch({
    skip: !toggleStatus,
    from,
    to,
  });
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isLoading]); // Update the time when data loads

  useQueryInspector({
    refetch,
    queryId: TABLE_QUERY_ID,
    loading: isLoading,
    setQuery,
    deleteQuery,
  });

  const [goToHostsAnomaliesTab, hostsAnomaliesTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.hosts,
      path: getTabsOnHostsUrl(HostsTableType.anomalies),
    });
    return [onClick, href];
  }, [getSecuritySolutionLinkProps]);

  const [goToUsersAnomaliesTab, usersAnomaliesTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersUrl(UsersTableType.anomalies),
    });
    return [onClick, href];
  }, [getSecuritySolutionLinkProps]);

  return (
    <EuiPanel hasBorder data-test-subj="entity_analytics_anomalies">
      <HeaderSection
        title={i18n.ANOMALIES_TITLE}
        titleSize="s"
        subtitle={<LastUpdatedAt isUpdating={isLoading} updatedAt={updatedAt} />}
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <LinkAnchor
              onClick={goToHostsAnomaliesTab}
              href={hostsAnomaliesTabUrl}
              className="eui-textNoWrap"
            >
              {i18n.VIEW_ALL_HOSTS_ANOMALIES}
            </LinkAnchor>
          </EuiFlexItem>
          <EuiFlexItem>
            <LinkAnchor
              onClick={goToUsersAnomaliesTab}
              href={usersAnomaliesTabUrl}
              data-test-subj="critical_hosts_link"
              className="eui-textNoWrap"
            >
              {i18n.VIEW_ALL_USERS_ANOMALIES}
            </LinkAnchor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LinkButton href={jobsUrl} target="_blank">
              {i18n.VIEW_ALL_ANOMALIES}
            </LinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderSection>
      {toggleStatus && (
        <EuiInMemoryTable
          responsive={false}
          items={data}
          columns={columns}
          loading={isLoading}
          id={TABLE_QUERY_ID}
          sorting={TABLE_SORTING}
        />
      )}
    </EuiPanel>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useDispatch } from 'react-redux';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../../explore/users/store/model';

import { getTabsOnHostsUrl } from '../../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType, HostsType } from '../../../../explore/hosts/store/model';

import { RiskScoreEntity } from '../../../../../common/search_strategy/security_solution/risk_score';
import { usersActions } from '../../../../explore/users/store';
import { RISKY_HOSTS_DOC_LINK, RISKY_USERS_DOC_LINK } from '../../../../../common/constants';
import { hostsActions } from '../../../../explore/hosts/store';
import { SecurityPageName } from '../../../../app/types';

const HOST_RISK_TABLE_QUERY_ID = 'hostRiskDashboardTable';
const HOST_RISK_KPI_QUERY_ID = 'headerHostRiskScoreKpiQuery';
const USER_RISK_TABLE_QUERY_ID = 'userRiskDashboardTable';
const USER_RISK_KPI_QUERY_ID = 'headerUserRiskScoreKpiQuery';

export const useEntityInfo = (riskEntity: RiskScoreEntity) => {
  const dispatch = useDispatch();

  return riskEntity === RiskScoreEntity.host
    ? {
        docLink: RISKY_HOSTS_DOC_LINK,
        linkProps: {
          deepLinkId: SecurityPageName.hosts,
          path: getTabsOnHostsUrl(HostsTableType.risk),
          onClick: () => {
            dispatch(
              hostsActions.updateHostRiskScoreSeverityFilter({
                severitySelection: [],
                hostsType: HostsType.page,
              })
            );
          },
        },
        tableQueryId: HOST_RISK_TABLE_QUERY_ID,
        kpiQueryId: HOST_RISK_KPI_QUERY_ID,
      }
    : {
        docLink: RISKY_USERS_DOC_LINK,
        linkProps: {
          deepLinkId: SecurityPageName.users,
          path: getTabsOnUsersUrl(UsersTableType.risk),
          onClick: () => {
            dispatch(
              usersActions.updateUserRiskScoreSeverityFilter({
                severitySelection: [],
              })
            );
          },
        },
        tableQueryId: USER_RISK_TABLE_QUERY_ID,
        kpiQueryId: USER_RISK_KPI_QUERY_ID,
      };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { getOr } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import { PaginatedTable } from '../paginated_table';

import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

import * as i18n from './translations';
import {
  getHostDetailsAuthenticationColumns,
  getHostsPageAuthenticationColumns,
  rowItems,
} from './helpers';
import { useAuthentications } from '../../containers/authentications';
import { useQueryInspector } from '../page/manage_query';
import { HostsComponentsQueryProps } from '../../../hosts/pages/navigation/types';
import { hostsActions, hostsModel, hostsSelectors } from '../../../hosts/store';
import { useQueryToggle } from '../../containers/query_toggle';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { AuthStackByField } from '../../../../common/search_strategy';

const TABLE_QUERY_ID = 'authenticationsHostsTableQuery';

const tableType = hostsModel.HostsTableType.authentications;

const AuthenticationsHostTableComponent: React.FC<HostsComponentsQueryProps> = ({
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  type,
  setQuery,
  deleteQuery,
}) => {
  const usersEnabled = useIsExperimentalFeatureEnabled('usersEnabled');
  const dispatch = useDispatch();
  const { toggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  const { activePage, limit } = useDeepEqualSelector((state) =>
    getAuthenticationsSelector(state, type)
  );

  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, inspect, isInspected, refetch },
  ] = useAuthentications({
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    skip: querySkip,
    startDate,
    stackByField: AuthStackByField.userName,
    activePage,
    limit,
  });

  const columns =
    type === hostsModel.HostsType.details
      ? getHostDetailsAuthenticationColumns(usersEnabled)
      : getHostsPageAuthenticationColumns(usersEnabled);

  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        hostsActions.updateTableLimit({
          hostsType: type,
          limit: newLimit,
          tableType,
        })
      ),
    [type, dispatch]
  );

  const updateActivePage = useCallback(
    (newPage) =>
      dispatch(
        hostsActions.updateTableActivePage({
          activePage: newPage,
          hostsType: type,
          tableType,
        })
      ),
    [type, dispatch]
  );

  useQueryInspector({
    queryId: TABLE_QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj="authentications-host-table"
      headerCount={totalCount}
      headerTitle={i18n.AUTHENTICATIONS}
      headerUnit={i18n.USERS_UNIT(totalCount)}
      id={TABLE_QUERY_ID}
      isInspect={isInspected}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      pageOfItems={authentications}
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      updateLimitPagination={updateLimitPagination}
      updateActivePage={updateActivePage}
    />
  );
};

AuthenticationsHostTableComponent.displayName = 'AuthenticationsHostTableComponent';

export const AuthenticationsHostTable = React.memo(AuthenticationsHostTableComponent);

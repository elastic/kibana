/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { assertUnreachable } from '../../../../common/utility_types';
import {
  Columns,
  Criteria,
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { getHostsColumns } from './columns';
import * as i18n from './translations';
import {
  HostsEdges,
  HostItem,
  HostsSortField,
  HostsFields,
} from '../../../../common/search_strategy/security_solution/hosts';
import { Direction, RiskSeverity } from '../../../../common/search_strategy';
import { HostEcs, OsEcs } from '../../../../common/ecs/host';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { SecurityPageName } from '../../../../common/constants';
import { HostsTableType } from '../../store/model';
import { useNavigateTo } from '../../../common/lib/kibana/hooks';

const tableType = hostsModel.HostsTableType.hosts;

interface HostsTableProps {
  data: HostsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type HostsTableColumns = [
  Columns<HostEcs['name']>,
  Columns<HostItem['lastSeen']>,
  Columns<OsEcs['name']>,
  Columns<OsEcs['version']>,
  Columns<RiskSeverity>?
];

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];
const getSorting = (sortField: HostsFields, direction: Direction): SortingBasicTable => ({
  field: getNodeField(sortField),
  direction,
});

const HostsTableComponent: React.FC<HostsTableProps> = ({
  data,
  fakeTotalCount,
  id,
  isInspect,
  loading,
  loadPage,
  showMorePagesIndicator,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigateTo();
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state) =>
    getHostsSelector(state, type)
  );

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

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const sort: HostsSortField = {
          field: getSortField(criteria.sort.field),
          direction: criteria.sort.direction as Direction,
        };
        if (sort.direction !== direction || sort.field !== sortField) {
          dispatch(
            hostsActions.updateHostsSort({
              sort,
              hostsType: type,
            })
          );
        }
      }
    },
    [direction, sortField, type, dispatch]
  );
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');

  const dispatchSeverityUpdate = useCallback(
    (s: RiskSeverity) => {
      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: [s],
          hostsType: type,
        })
      );
      navigateTo({
        deepLinkId: SecurityPageName.hosts,
        path: HostsTableType.risk,
      });
    },
    [dispatch, navigateTo, type]
  );

  const hostsColumns = useMemo(
    () => getHostsColumns(riskyHostsFeatureEnabled, dispatchSeverityUpdate),
    [dispatchSeverityUpdate, riskyHostsFeatureEnabled]
  );

  const sorting = useMemo(() => getSorting(sortField, direction), [sortField, direction]);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={hostsColumns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={i18n.HOSTS}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      isInspect={isInspect}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onChange}
      pageOfItems={data}
      showMorePagesIndicator={showMorePagesIndicator}
      sorting={sorting}
      totalCount={fakeTotalCount}
      updateLimitPagination={updateLimitPagination}
      updateActivePage={updateActivePage}
    />
  );
};

HostsTableComponent.displayName = 'HostsTableComponent';

const getSortField = (field: string): HostsFields => {
  switch (field) {
    case 'node.host.name':
      return HostsFields.hostName;
    case 'node.lastSeen':
      return HostsFields.lastSeen;
    default:
      return HostsFields.lastSeen;
  }
};

const getNodeField = (field: HostsFields): string => {
  switch (field) {
    case HostsFields.hostName:
      return 'node.host.name';
    case HostsFields.lastSeen:
      return 'node.lastSeen';
  }
  assertUnreachable(field);
};

export const HostsTable = React.memo(HostsTableComponent);

HostsTable.displayName = 'HostsTable';

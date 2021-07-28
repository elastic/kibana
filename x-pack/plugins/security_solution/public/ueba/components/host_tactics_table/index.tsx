/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import {
  Columns,
  Criteria,
  PaginatedTable,
  SortingBasicTable,
} from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { uebaActions, uebaModel, uebaSelectors } from '../../store';
import { getHostTacticsColumns } from './columns';
import * as i18n from './translations';
import {
  HostTacticsEdges,
  HostTacticsItem,
  HostTacticsSortField,
  HostTacticsFields,
} from '../../../../common';
import { Direction } from '../../../../common/search_strategy';
import { HOST_TACTICS } from '../../pages/translations';
import { rowItems } from '../utils';

const tableType = uebaModel.UebaTableType.hostTactics;

interface HostTacticsTableProps {
  data: HostTacticsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  techniqueCount: number;
  totalCount: number;
  type: uebaModel.UebaType;
}

export type HostTacticsColumns = [
  Columns<HostTacticsItem[HostTacticsFields.tactic]>,
  Columns<HostTacticsItem[HostTacticsFields.technique]>,
  Columns<HostTacticsItem[HostTacticsFields.riskScore]>,
  Columns<HostTacticsItem[HostTacticsFields.hits]>
];

const getSorting = (sortField: HostTacticsFields, direction: Direction): SortingBasicTable => ({
  field: getNodeField(sortField),
  direction,
});

const HostTacticsTableComponent: React.FC<HostTacticsTableProps> = ({
  data,
  fakeTotalCount,
  id,
  isInspect,
  loading,
  loadPage,
  showMorePagesIndicator,
  techniqueCount,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const { activePage, limit, sort } = useDeepEqualSelector(uebaSelectors.hostTacticsSelector());
  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        uebaActions.updateTableLimit({
          uebaType: type,
          limit: newLimit,
          tableType,
        })
      ),
    [type, dispatch]
  );

  const updateActivePage = useCallback(
    (newPage) =>
      dispatch(
        uebaActions.updateTableActivePage({
          activePage: newPage,
          uebaType: type,
          tableType, // this will need to become unique for each user table in the group
        })
      ),
    [type, dispatch]
  );

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort: HostTacticsSortField = {
          field: getSortField(criteria.sort.field),
          direction: criteria.sort.direction as Direction,
        };
        if (newSort.direction !== sort.direction || newSort.field !== sort.field) {
          // dispatch(
          //   uebaActions.updateHostTacticsSort({
          //     sort,
          //     uebaType: type,
          //   })
          // ); TODO: Steph/ueba implement sorting
        }
      }
    },
    [sort]
  );

  const columns = useMemo(() => getHostTacticsColumns(), []);

  const sorting = useMemo(() => getSorting(sort.field, sort.direction), [sort]);
  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={HOST_TACTICS}
      headerSubtitle={i18n.COUNT(totalCount, techniqueCount)}
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

HostTacticsTableComponent.displayName = 'HostTacticsTableComponent';

const getSortField = (field: string): HostTacticsFields => {
  switch (field) {
    case `node.${HostTacticsFields.tactic}`:
      return HostTacticsFields.tactic;
    case `node.${HostTacticsFields.riskScore}`:
      return HostTacticsFields.riskScore;
    default:
      return HostTacticsFields.riskScore;
  }
};

const getNodeField = (field: HostTacticsFields): string => `node.${field}`;

export const HostTacticsTable = React.memo(HostTacticsTableComponent);

HostTacticsTable.displayName = 'HostTacticsTable';

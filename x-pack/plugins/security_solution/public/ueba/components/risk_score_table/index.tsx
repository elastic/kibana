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
import { getRiskScoreColumns } from './columns';
import * as i18n from './translations';
import {
  RiskScoreEdges,
  RiskScoreItem,
  RiskScoreSortField,
  RiskScoreFields,
} from '../../../../common';
import { Direction } from '../../../../common/search_strategy';
import { rowItems } from '../utils';

const tableType = uebaModel.UebaTableType.riskScore;

interface RiskScoreTableProps {
  data: RiskScoreEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: uebaModel.UebaType;
}

export type RiskScoreColumns = [
  Columns<RiskScoreItem['host_name']>,
  Columns<RiskScoreItem['risk_keyword']>
];

const getSorting = (sortField: RiskScoreFields, direction: Direction): SortingBasicTable => ({
  field: getNodeField(sortField),
  direction,
});

const RiskScoreTableComponent: React.FC<RiskScoreTableProps> = ({
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
  const { activePage, limit, sort } = useDeepEqualSelector(uebaSelectors.riskScoreSelector());
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
          tableType,
        })
      ),
    [type, dispatch]
  );

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort: RiskScoreSortField = {
          field: getSortField(criteria.sort.field),
          direction: criteria.sort.direction as Direction,
        };
        if (newSort.direction !== sort.direction || newSort.field !== sort.field) {
          // dispatch(
          //   uebaActions.updateRiskScoreSort({
          //     sort,
          //     uebaType: type,
          //   })
          // ); TODO: Steph/ueba implement sorting
        }
      }
    },
    [sort]
  );

  const columns = useMemo(() => getRiskScoreColumns(), []);

  const sorting = useMemo(() => getSorting(sort.field, sort.direction), [sort]);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={i18n.RISK_SCORE}
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

RiskScoreTableComponent.displayName = 'RiskScoreTableComponent';

const getSortField = (field: string): RiskScoreFields => {
  switch (field) {
    case `node.${RiskScoreFields.hostName}`:
      return RiskScoreFields.hostName;
    case `node.${RiskScoreFields.riskScore}`:
      return RiskScoreFields.riskScore;
    default:
      return RiskScoreFields.riskScore;
  }
};

const getNodeField = (field: RiskScoreFields): string => `node.${field}`;

export const RiskScoreTable = React.memo(RiskScoreTableComponent);

RiskScoreTable.displayName = 'RiskScoreTable';

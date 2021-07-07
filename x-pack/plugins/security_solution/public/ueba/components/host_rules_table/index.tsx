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
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../common/components/paginated_table';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { uebaActions, uebaModel, uebaSelectors } from '../../store';
import { getHostRulesColumns } from './columns';
import * as i18n from './translations';
import {
  HostRulesEdges,
  HostRulesItem,
  HostRulesSortField,
  HostRulesFields,
} from '../../../../common';
import { Direction } from '../../../../common/search_strategy';
import { HOST_RULES } from '../../pages/translations';

const tableType = uebaModel.UebaTableType.hostRules;

interface HostRulesTableProps {
  data: HostRulesEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: uebaModel.UebaType;
}

export type HostRulesColumns = [
  Columns<HostRulesItem[HostRulesFields.ruleName]>,
  Columns<HostRulesItem[HostRulesFields.ruleType]>,
  Columns<HostRulesItem[HostRulesFields.riskScore]>,
  Columns<HostRulesItem[HostRulesFields.hits]>
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
const getSorting = (sortField: HostRulesFields, direction: Direction): SortingBasicTable => ({
  field: getNodeField(sortField),
  direction,
});

const HostRulesTableComponent: React.FC<HostRulesTableProps> = ({
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
  const { activePage, limit, sort } = useDeepEqualSelector(uebaSelectors.hostRulesSelector());
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
        const newSort: HostRulesSortField = {
          field: getSortField(criteria.sort.field),
          direction: criteria.sort.direction as Direction,
        };
        if (newSort.direction !== sort.direction || newSort.field !== sort.field) {
          // dispatch(
          //   uebaActions.updateHostRulesSort({
          //     sort,
          //     uebaType: type,
          //   })
          // ); TO DO Steph
        }
      }
    },
    [sort]
  );

  const columns = useMemo(() => getHostRulesColumns(), []);

  const sorting = useMemo(() => getSorting(sort.field, sort.direction), [sort]);

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      headerCount={totalCount}
      headerTitle={HOST_RULES}
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

HostRulesTableComponent.displayName = 'HostRulesTableComponent';

const getSortField = (field: string): HostRulesFields => {
  switch (field) {
    case `node.${HostRulesFields.ruleName}`:
      return HostRulesFields.ruleName;
    case `node.${HostRulesFields.riskScore}`:
      return HostRulesFields.riskScore;
    default:
      return HostRulesFields.riskScore;
  }
};

const getNodeField = (field: HostRulesFields): string => `node.${field}`;

export const HostRulesTable = React.memo(HostRulesTableComponent);

HostRulesTable.displayName = 'HostRulesTable';

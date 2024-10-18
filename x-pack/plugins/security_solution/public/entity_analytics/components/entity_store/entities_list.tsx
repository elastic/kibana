/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import type { CriticalityLevels } from '../../../../common/constants';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { Direction } from '../../../../common/search_strategy/common';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import type { Criteria } from '../../../explore/components/paginated_table';
import { PaginatedTable } from '../../../explore/components/paginated_table';
import { SeverityFilter } from '../severity/severity_filter';
import type { EntitySource } from './components/entity_source_filter';
import { useEntitiesListFilters } from './hooks/use_entities_list_filters';
import { AssetCriticalityFilter } from '../asset_criticality/asset_criticality_filter';
import { useEntitiesListQuery } from './hooks/use_entities_list_query';
import { ENTITIES_LIST_TABLE_ID, rowItems } from './constants';
import { useEntitiesListColumns } from './hooks/use_entities_list_columns';

export const EntitiesList: React.FC = () => {
  const { deleteQuery, setQuery, isInitializing, from, to } = useGlobalTime();
  const [activePage, setActivePage] = useState(0);
  const [limit, setLimit] = useState(10);
  const { toggleStatus } = useQueryToggle(ENTITIES_LIST_TABLE_ID);
  const [sorting, setSorting] = useState({
    field: 'entity.lastSeenTimestamp',
    direction: Direction.desc,
  });

  const [selectedSeverities, setSelectedSeverities] = useState<RiskSeverity[]>([]);
  const [selectedCriticalities, setSelectedCriticalities] = useState<CriticalityLevels[]>([]);
  const [selectedSources, _] = useState<EntitySource[]>([]);

  const filter = useEntitiesListFilters({
    selectedSeverities,
    selectedCriticalities,
    selectedSources,
  });

  const [querySkip, setQuerySkip] = useState(isInitializing || !toggleStatus);
  useEffect(() => {
    if (!isInitializing) {
      setQuerySkip(isInitializing || !toggleStatus);
    }
  }, [isInitializing, toggleStatus]);

  const onSort = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort = criteria.sort;
        if (newSort.direction !== sorting.direction || newSort.field !== sorting.field) {
          setSorting(newSort);
        }
      }
    },
    [setSorting, sorting]
  );

  const searchParams = useMemo(
    () => ({
      entitiesTypes: [EntityType.Enum.user, EntityType.Enum.host],
      page: activePage + 1,
      perPage: limit,
      sortField: sorting.field,
      sortOrder: sorting.direction,
      skip: querySkip,
      filterQuery: JSON.stringify({
        bool: {
          filter,
        },
      }),
    }),
    [activePage, limit, querySkip, sorting, filter]
  );
  const { data, isLoading, isRefetching, refetch, error } = useEntitiesListQuery(searchParams);

  useQueryInspector({
    queryId: ENTITIES_LIST_TABLE_ID,
    loading: isLoading || isRefetching,
    refetch,
    setQuery,
    deleteQuery,
    inspect: data?.inspect ?? null,
  });

  const columns = useEntitiesListColumns();

  // Force a refetch when "refresh" button is clicked.
  // If we implement the timerange filter we can get rid of this code
  useEffect(() => {
    refetch();
  }, [from, to, refetch]);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.entitiesList.queryError', {
      defaultMessage: 'There was an error loading the entities list',
    }),
    error
  );

  return (
    <PaginatedTable
      id={ENTITIES_LIST_TABLE_ID}
      activePage={(data?.page ?? 1) - 1}
      columns={columns}
      headerCount={data?.total ?? 0}
      headerTitle={
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.tableTitle"
              defaultMessage="Entities"
            />
          </h2>
        </EuiTitle>
      }
      limit={limit}
      loading={isLoading || isRefetching}
      isInspect={false}
      updateActivePage={setActivePage}
      loadPage={noop} // It isn't necessary because the page loads when activePage changes
      pageOfItems={data?.records ?? []}
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={false}
      updateLimitPagination={setLimit}
      totalCount={data?.total ?? 0}
      itemsPerRow={rowItems}
      sorting={sorting}
      onChange={onSort}
      headerFilters={
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <SeverityFilter selectedItems={selectedSeverities} onSelect={setSelectedSeverities} />
              <AssetCriticalityFilter
                selectedItems={selectedCriticalities}
                onChange={setSelectedCriticalities}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

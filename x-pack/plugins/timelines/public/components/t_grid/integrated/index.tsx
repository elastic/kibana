/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataViewBase, Filter, Query } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { Direction, EntityType } from '../../../../common/search_strategy';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  BulkActionsProp,
  FieldBrowserOptions,
  TGridCellAction,
} from '../../../../common/types/timeline';

import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  AlertStatus,
} from '../../../../common/types/timeline';

import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { getCombinedFilterQuery } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { Ecs } from '../../../../common/ecs';
import { useTimelineEvents, InspectResponse, Refetch } from '../../../container';
import { StatefulBody } from '../body';
import { Sort } from '../body/sort';
import { TGridEmpty } from '../shared';

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

const SECURITY_ALERTS_CONSUMERS = [AlertConsumers.SIEM];

export interface TGridIntegratedProps {
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  columns: ColumnHeaderOptions[];
  data?: DataPublicPluginStart;
  dataViewId?: string | null;
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  disabledCellActions: string[];
  end: string;
  entityType: EntityType;
  fieldBrowserOptions?: FieldBrowserOptions;
  filters: Filter[];
  filterStatus?: AlertStatus;
  getRowRenderer?: ({
    data,
    rowRenderers,
  }: {
    data: Ecs;
    rowRenderers: RowRenderer[];
  }) => RowRenderer | null;
  hasAlertsCrud: boolean;
  height?: number;
  id: string;
  indexNames: string[];
  indexPattern: DataViewBase;
  isLive: boolean;
  isLoadingIndexPattern: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  leadingControlColumns?: ControlColumnProps[];
  onRuleChange?: () => void;
  query: Query;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  runtimeMappings: MappingRuntimeFields;
  setQuery: (inspect: InspectResponse, loading: boolean, refetch: Refetch) => void;
  sort: Sort[];
  start: string;
  trailingControlColumns?: ControlColumnProps[];
  unit?: (n: number) => string;
}

const TGridIntegratedComponent: React.FC<TGridIntegratedProps> = ({
  browserFields,
  bulkActions = true,
  columns,
  data,
  dataViewId = null,
  defaultCellActions,
  deletedEventIds,
  disabledCellActions,
  end,
  entityType,
  fieldBrowserOptions,
  filters,
  filterStatus,
  getRowRenderer,
  hasAlertsCrud,
  id,
  indexNames,
  indexPattern,
  isLoadingIndexPattern,
  itemsPerPage,
  itemsPerPageOptions,
  leadingControlColumns,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  runtimeMappings,
  setQuery,
  sort,
  start,
  unit,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;

  const getManageDataTable = useMemo(() => tGridSelectors.getManageDataTableById(), []);

  const { queryFields } = useDeepEqualSelector((state) => getManageDataTable(state, id ?? ''));

  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders: [],
        filters,
        from: start,
        indexPattern,
        kqlMode: 'filter',
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, indexPattern, browserFields, filters, start, end, query]
  );

  const canQueryTimeline = useMemo(
    () =>
      filterQuery != null &&
      isLoadingIndexPattern != null &&
      !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingIndexPattern, filterQuery, start, end]
  );

  const fields = useMemo(
    () => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])],
    [columnsHeader, queryFields]
  );

  const sortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sort]
  );

  const [loading, { events, loadPage, pageInfo, refetch, totalCount = 0, inspect }] =
    useTimelineEvents({
      // We rely on entityType to determine Events vs Alerts
      alertConsumers: SECURITY_ALERTS_CONSUMERS,
      data,
      dataViewId,
      endDate: end,
      entityType,
      fields,
      filterQuery,
      id,
      indexNames,
      limit: itemsPerPage,
      runtimeMappings,
      skip: !canQueryTimeline,
      sort: sortField,
      startDate: start,
    });

  useEffect(() => {
    dispatch(tGridActions.updateIsLoading({ id, isLoading: loading }));
  }, [dispatch, id, loading]);

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const hasAlerts = totalCountMinusDeleted > 0;

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );
  useEffect(() => {
    setQuery(inspect, loading, refetch);
  }, [inspect, loading, refetch, setQuery]);

  // Clear checkbox selection when new events are fetched
  useEffect(() => {
    dispatch(tGridActions.clearSelected({ id }));
    dispatch(
      tGridActions.setTGridSelectAll({
        id,
        selectAll: false,
      })
    );
  }, [nonDeletedEvents, dispatch, id]);

  return (
    <>
      {!hasAlerts && !loading && !graphOverlay && <TGridEmpty height="short" />}
      {hasAlerts && (
        <FullWidthFlexGroup $visible={!graphEventId && graphOverlay == null} gutterSize="none">
          <ScrollableFlexItem grow={1}>
            <StatefulBody
              activePage={pageInfo.activePage}
              browserFields={browserFields}
              bulkActions={bulkActions}
              data={nonDeletedEvents}
              defaultCellActions={defaultCellActions}
              disabledCellActions={disabledCellActions}
              fieldBrowserOptions={fieldBrowserOptions}
              filterQuery={filterQuery}
              filters={filters}
              filterStatus={filterStatus}
              getRowRenderer={getRowRenderer}
              hasAlertsCrud={hasAlertsCrud}
              id={id}
              indexNames={indexNames}
              isEventViewer={true}
              itemsPerPageOptions={itemsPerPageOptions}
              leadingControlColumns={leadingControlColumns}
              loadPage={loadPage}
              onRuleChange={onRuleChange}
              pageSize={itemsPerPage}
              refetch={refetch}
              renderCellValue={renderCellValue}
              rowRenderers={rowRenderers}
              tabType={'query'}
              totalItems={totalCountMinusDeleted}
              unit={unit}
            />
          </ScrollableFlexItem>
        </FullWidthFlexGroup>
      )}
    </>
  );
};

export const TGridIntegrated = React.memo(TGridIntegratedComponent);

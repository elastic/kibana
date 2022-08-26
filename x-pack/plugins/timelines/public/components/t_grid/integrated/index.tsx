/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { EuiPanel } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';

import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  DataProvider,
  RowRenderer,
  AlertStatus,
} from '../../../../common/types/timeline';

import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { getCombinedFilterQuery } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { useTimelineEvents, InspectResponse, Refetch } from '../../../container';
import { StatefulBody } from '../body';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from '../styles';
import { Sort } from '../body/sort';
import { TGridLoading, TGridEmpty } from '../shared';

const StyledEuiPanel = styled(EuiPanel)<{ $isFullScreen: boolean }>`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;

  ${({ $isFullScreen }) =>
    $isFullScreen &&
    `
      border: 0;
      box-shadow: none;
      padding-top: 0;
      padding-bottom: 0;
  `}
`;

const EventsContainerLoading = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`,
}))`
  position: relative;
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const SECURITY_ALERTS_CONSUMERS = [AlertConsumers.SIEM];

export interface TGridIntegratedProps {
  appId: string;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  columns: ColumnHeaderOptions[];
  data?: DataPublicPluginStart;
  dataProviders: DataProvider[];
  dataViewId?: string | null;
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  disabledCellActions: string[];
  end: string;
  entityType: EntityType;
  fieldBrowserOptions?: FieldBrowserOptions;
  filters: Filter[];
  filterStatus?: AlertStatus;
  globalFullScreen: boolean;
  hasAlertsCrud: boolean;
  height?: number;
  id: TimelineId;
  indexNames: string[];
  indexPattern: DataViewBase;
  isLive: boolean;
  isLoadingIndexPattern: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: 'filter' | 'search';
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
  appId,
  browserFields,
  bulkActions,
  columns,
  data,
  dataProviders,
  dataViewId = null,
  defaultCellActions,
  deletedEventIds,
  disabledCellActions,
  end,
  entityType,
  fieldBrowserOptions,
  filters,
  filterStatus,
  globalFullScreen,
  hasAlertsCrud,
  id,
  indexNames,
  indexPattern,
  isLoadingIndexPattern,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  leadingControlColumns,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  runtimeMappings,
  setQuery,
  sort,
  start,
  trailingControlColumns,
  unit,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(true);

  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const { queryFields } = useDeepEqualSelector((state) => getManageTimeline(state, id ?? ''));

  useEffect(() => {
    dispatch(tGridActions.updateIsLoading({ id, isLoading: isQueryLoading }));
  }, [dispatch, id, isQueryLoading]);

  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders,
        filters,
        from: start,
        indexPattern,
        kqlMode,
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, dataProviders, indexPattern, browserFields, filters, start, end, query, kqlMode]
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
    setIsQueryLoading(loading);
  }, [loading]);

  const isFirstUpdate = useRef(true);
  useEffect(() => {
    if (isFirstUpdate.current && !loading) {
      isFirstUpdate.current = false;
    }
  }, [loading]);

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
    <StyledEuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      data-test-subj="events-viewer-panel"
      $isFullScreen={globalFullScreen}
    >
      {isFirstUpdate.current && <TGridLoading height="short" />}
      {canQueryTimeline && (
        <EventsContainerLoading
          data-timeline-id={id}
          data-test-subj={`events-container-loading-${loading}`}
        >
          <>
            {!hasAlerts && !loading && <TGridEmpty height="short" />}
            {hasAlerts && (
              <StatefulBody
                activePage={pageInfo.activePage}
                appId={appId}
                browserFields={browserFields}
                bulkActions={bulkActions}
                data={nonDeletedEvents}
                defaultCellActions={defaultCellActions}
                disabledCellActions={disabledCellActions}
                fieldBrowserOptions={fieldBrowserOptions}
                filterQuery={filterQuery}
                filters={filters}
                filterStatus={filterStatus}
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
                tabType={TimelineTabs.query}
                totalItems={totalCountMinusDeleted}
                trailingControlColumns={trailingControlColumns}
                unit={unit}
              />
            )}
          </>
        </EventsContainerLoading>
      )}
    </StyledEuiPanel>
  );
};

export const TGridIntegrated = React.memo(TGridIntegratedComponent);

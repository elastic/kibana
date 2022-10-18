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
} from '../../../../common/types/timeline';

import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  AlertStatus,
} from '../../../../common/types/timeline';

import { getCombinedFilterQuery } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { Ecs } from '../../../../common/ecs';
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
  globalFullScreen: boolean;
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
  appId,
  browserFields,
  bulkActions,
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
  globalFullScreen,
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
  trailingControlColumns,
  unit,
}) => {
  const dispatch = useDispatch();
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(true);

  const getManageDataTable = useMemo(() => tGridSelectors.getManageDataTableById(), []);

  dispatch(tGridActions.updateIsLoading({ id, isLoading: isQueryLoading }));
  getManageDataTable(state, id ?? '');

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

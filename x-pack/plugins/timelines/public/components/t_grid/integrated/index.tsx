/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataViewBase, Filter, Query } from '@kbn/es-query';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { Direction, EntityType } from '../../../../common/search_strategy';
import type { DocValueFields } from '../../../../common/search_strategy';
import type { CoreStart } from '../../../../../../../src/core/public';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  BulkActionsProp,
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

import type { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { buildCombinedQuery, getCombinedFilterQuery, resolverIsShowing } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { useTimelineEvents, InspectResponse, Refetch } from '../../../container';
import { FieldBrowserOptions } from '../../fields_browser';
import { StatefulBody } from '../body';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER, UpdatedFlexGroup, UpdatedFlexItem } from '../styles';
import { Sort } from '../body/sort';
import { InspectButton, InspectButtonContainer } from '../../inspect';
import { SummaryViewSelector, ViewSelection } from '../event_rendered_view/selector';
import { TGridLoading, TGridEmpty, TimelineContext } from '../shared';

const TitleText = styled.span`
  margin-right: 12px;
`;

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
  additionalFilters: React.ReactNode;
  appId: string;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  columns: ColumnHeaderOptions[];
  data?: DataPublicPluginStart;
  dataProviders: DataProvider[];
  dataViewId?: string | null;
  defaultCellActions?: TGridCellAction[];
  visibleCellActions?: number;
  deletedEventIds: Readonly<string[]>;
  disabledCellActions: string[];
  docValueFields: DocValueFields[];
  end: string;
  entityType: EntityType;
  fieldBrowserOptions?: FieldBrowserOptions;
  filters: Filter[];
  filterStatus?: AlertStatus;
  globalFullScreen: boolean;
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId?: string;
  graphOverlay?: React.ReactNode;
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
  tGridEventRenderedViewEnabled: boolean;
  trailingControlColumns?: ControlColumnProps[];
  unit?: (n: number) => string;
}

const TGridIntegratedComponent: React.FC<TGridIntegratedProps> = ({
  additionalFilters,
  appId,
  browserFields,
  bulkActions = true,
  columns,
  data,
  dataProviders,
  dataViewId = null,
  defaultCellActions,
  visibleCellActions,
  deletedEventIds,
  disabledCellActions,
  docValueFields,
  end,
  entityType,
  fieldBrowserOptions,
  filters,
  filterStatus,
  globalFullScreen,
  graphEventId,
  graphOverlay = null,
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
  tGridEventRenderedViewEnabled,
  trailingControlColumns,
  unit,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(true);

  const [tableView, setTableView] = useState<ViewSelection>('gridView');
  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const { queryFields, title } = useDeepEqualSelector((state) =>
    getManageTimeline(state, id ?? '')
  );

  useEffect(() => {
    dispatch(tGridActions.updateIsLoading({ id, isLoading: isQueryLoading }));
  }, [dispatch, id, isQueryLoading]);

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const combinedQueries = buildCombinedQuery({
    config: getEsQueryConfig(uiSettings),
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery: query,
    kqlMode,
    isEventViewer: true,
  });

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      isLoadingIndexPattern != null &&
      !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingIndexPattern, combinedQueries, start, end]
  );

  const fields = useMemo(
    () => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])],
    [columnsHeader, queryFields]
  );

  const sortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
      })),
    [sort]
  );

  const [loading, { events, loadPage, pageInfo, refetch, totalCount = 0, inspect }] =
    useTimelineEvents({
      // We rely on entityType to determine Events vs Alerts
      alertConsumers: SECURITY_ALERTS_CONSUMERS,
      data,
      dataViewId,
      docValueFields,
      endDate: end,
      entityType,
      fields,
      filterQuery: combinedQueries?.filterQuery,
      id,
      indexNames,
      limit: itemsPerPage,
      runtimeMappings,
      skip: !canQueryTimeline,
      sort: sortField,
      startDate: start,
    });

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: getEsQueryConfig(uiSettings),
        browserFields,
        dataProviders,
        filters,
        from: start,
        indexPattern,
        isEventViewer: true,
        kqlMode,
        kqlQuery: query,
        to: end,
      }),
    [uiSettings, dataProviders, indexPattern, browserFields, filters, start, end, query, kqlMode]
  );

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

  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';

  const isFirstUpdate = useRef(true);
  useEffect(() => {
    if (isFirstUpdate.current && !loading) {
      isFirstUpdate.current = false;
    }
  }, [loading]);

  useEffect(() => {
    setQuery(inspect, loading, refetch);
  }, [inspect, loading, refetch, setQuery]);
  const timelineContext = useMemo(() => ({ timelineId: id }), [id]);

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
    <InspectButtonContainer>
      <StyledEuiPanel
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        data-test-subj="events-viewer-panel"
        $isFullScreen={globalFullScreen}
      >
        {isFirstUpdate.current && <TGridLoading height="short" />}

        {graphOverlay}

        {canQueryTimeline && (
          <TimelineContext.Provider value={timelineContext}>
            <EventsContainerLoading
              data-timeline-id={id}
              data-test-subj={`events-container-loading-${loading}`}
            >
              <UpdatedFlexGroup
                alignItems={alignItems}
                data-test-subj="updated-flex-group"
                gutterSize="m"
                justifyContent="flexEnd"
                $view={tableView}
              >
                <UpdatedFlexItem grow={false} $show={!loading}>
                  <InspectButton title={justTitle} inspect={inspect} loading={loading} />
                </UpdatedFlexItem>
                <UpdatedFlexItem grow={false} $show={!loading}>
                  {!resolverIsShowing(graphEventId) && additionalFilters}
                </UpdatedFlexItem>
                {tGridEventRenderedViewEnabled &&
                  ['detections-page', 'detections-rules-details-page'].includes(id) && (
                    <UpdatedFlexItem grow={false} $show={!loading}>
                      <SummaryViewSelector viewSelected={tableView} onViewChange={setTableView} />
                    </UpdatedFlexItem>
                  )}
              </UpdatedFlexGroup>
              <>
                {!hasAlerts && !loading && <TGridEmpty height="short" />}
                {hasAlerts && (
                  <FullWidthFlexGroup
                    $visible={!graphEventId && graphOverlay == null}
                    gutterSize="none"
                  >
                    <ScrollableFlexItem grow={1}>
                      <StatefulBody
                        activePage={pageInfo.activePage}
                        appId={appId}
                        browserFields={browserFields}
                        bulkActions={bulkActions}
                        data={nonDeletedEvents}
                        defaultCellActions={defaultCellActions}
                        visibleCellActions={visibleCellActions}
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
                        tableView={tableView}
                        tabType={TimelineTabs.query}
                        totalItems={totalCountMinusDeleted}
                        trailingControlColumns={trailingControlColumns}
                        unit={unit}
                      />
                    </ScrollableFlexItem>
                  </FullWidthFlexGroup>
                )}
              </>
            </EventsContainerLoading>
          </TimelineContext.Provider>
        )}
      </StyledEuiPanel>
    </InspectButtonContainer>
  );
};

export const TGridIntegrated = React.memo(TGridIntegratedComponent);

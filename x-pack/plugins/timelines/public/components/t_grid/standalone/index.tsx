/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter, Query } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

import type { Ecs } from '../../../../common/ecs';
import { Direction, EntityType } from '../../../../common/search_strategy';
import { TGridCellAction, TimelineTabs } from '../../../../common/types/timeline';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  DataProvider,
  RowRenderer,
  SortColumnTimeline,
  BulkActionsProp,
  AlertStatus,
} from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { getCombinedFilterQuery } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import type { State } from '../../../store/t_grid';
import { useTimelineEvents } from '../../../container';
import { StatefulBody } from '../body';
import { LastUpdatedAt } from '../..';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER, UpdatedFlexItem, UpdatedFlexGroup } from '../styles';
import { InspectButton, InspectButtonContainer } from '../../inspect';
import { useFetchIndex } from '../../../container/source';
import { TGridLoading, TGridEmpty, TimelineContext } from '../shared';

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

export const EVENTS_VIEWER_HEADER_HEIGHT = 90; // px
export const STANDALONE_ID = 'standalone-t-grid';
const EMPTY_DATA_PROVIDERS: DataProvider[] = [];

const TitleText = styled.span`
  margin-right: 12px;
`;

const AlertsTableWrapper = styled.div`
  width: 100%;
  height: 100%;
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

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

export interface TGridStandaloneProps {
  columns: ColumnHeaderOptions[];
  dataViewId?: string | null;
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  disabledCellActions: string[];
  end: string;
  entityType?: EntityType;
  loadingText: React.ReactNode;
  filters: Filter[];
  footerText: React.ReactNode;
  filterStatus?: AlertStatus;
  getRowRenderer?: ({
    data,
    rowRenderers,
  }: {
    data: Ecs;
    rowRenderers: RowRenderer[];
  }) => RowRenderer | null;
  hasAlertsCrudPermissions: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
  height?: number;
  indexNames: string[];
  itemsPerPage?: number;
  itemsPerPageOptions: number[];
  query: Query;
  onRuleChange?: () => void;
  onStateChange?: (state: State) => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  runtimeMappings: MappingRuntimeFields;
  setRefetch: (ref: () => void) => void;
  start: string;
  sort: SortColumnTimeline[];
  graphEventId?: string;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
  bulkActions?: BulkActionsProp;
  data?: DataPublicPluginStart;
  unit?: (total: number) => React.ReactNode;
  showCheckboxes?: boolean;
  queryFields?: string[];
}

const TGridStandaloneComponent: React.FC<TGridStandaloneProps> = ({
  columns,
  dataViewId = null,
  defaultCellActions,
  deletedEventIds,
  disabledCellActions,
  end,
  entityType = 'alerts',
  loadingText,
  filters,
  footerText,
  filterStatus,
  getRowRenderer,
  hasAlertsCrudPermissions,
  indexNames,
  itemsPerPage,
  itemsPerPageOptions,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  runtimeMappings,
  setRefetch,
  start,
  sort,
  graphEventId,
  leadingControlColumns,
  trailingControlColumns,
  data,
  unit,
  showCheckboxes = true,
  bulkActions = {},
  queryFields = [],
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [indexPatternsLoading, { browserFields, indexPatterns }] = useFetchIndex(indexNames);

  const getTGrid = useMemo(() => tGridSelectors.getTGridByIdSelector(), []);
  const {
    itemsPerPage: itemsPerPageStore,
    itemsPerPageOptions: itemsPerPageOptionsStore,
    queryFields: queryFieldsFromState,
    sort: sortStore,
    title,
  } = useDeepEqualSelector((state) => getTGrid(state, STANDALONE_ID ?? ''));

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);
  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders: EMPTY_DATA_PROVIDERS,
        filters,
        from: start,
        indexPattern: indexPatterns,
        kqlMode: 'search',
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, indexPatterns, browserFields, filters, start, end, query]
  );

  const canQueryTimeline = useMemo(
    () =>
      filterQuery != null &&
      indexPatternsLoading != null &&
      !indexPatternsLoading &&
      !isEmpty(start) &&
      !isEmpty(end),
    [indexPatternsLoading, filterQuery, start, end]
  );

  const fields = useMemo(
    () => [
      ...columnsHeader.reduce<string[]>(
        (acc, c) => (c.linkField != null ? [...acc, c.id, c.linkField] : [...acc, c.id]),
        []
      ),
      ...(queryFieldsFromState ?? []),
    ],
    [columnsHeader, queryFieldsFromState]
  );

  const sortField = useMemo(
    () =>
      sortStore.map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sortStore]
  );

  const [
    loading,
    { consumers, events, updatedAt, loadPage, pageInfo, refetch, totalCount = 0, inspect },
  ] = useTimelineEvents({
    dataViewId,
    entityType,
    excludeEcsData: true,
    fields,
    filterQuery,
    id: STANDALONE_ID,
    indexNames,
    limit: itemsPerPageStore,
    runtimeMappings,
    sort: sortField,
    startDate: start,
    endDate: end,
    skip: !canQueryTimeline,
    data,
  });
  setRefetch(refetch);

  useEffect(() => {
    dispatch(tGridActions.updateIsLoading({ id: STANDALONE_ID, isLoading: loading }));
  }, [dispatch, loading]);

  const { hasAlertsCrud, totalSelectAllAlerts } = useMemo(() => {
    return Object.entries(consumers).reduce<{
      hasAlertsCrud: boolean;
      totalSelectAllAlerts: number;
    }>(
      (acc, [ruleConsumer, nbrAlerts]) => {
        const featureHasPermission = hasAlertsCrudPermissions({ ruleConsumer });
        return {
          hasAlertsCrud: featureHasPermission || acc.hasAlertsCrud,
          totalSelectAllAlerts: featureHasPermission
            ? nbrAlerts + acc.totalSelectAllAlerts
            : acc.totalSelectAllAlerts,
        };
      },
      {
        hasAlertsCrud: false,
        totalSelectAllAlerts: 0,
      }
    );
  }, [consumers, hasAlertsCrudPermissions]);

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );
  const hasAlerts = totalCountMinusDeleted > 0;

  // Only show the table-spanning loading indicator when the query is loading and we
  // don't have data (e.g. for the initial fetch).
  // Subsequent fetches (e.g. for pagination) will show a small loading indicator on
  // top of the table and the table will display the current page until the next page
  // is fetched. This prevents a flicker when paginating.
  const showFullLoading = loading && !hasAlerts;

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );

  useEffect(() => {
    dispatch(
      tGridActions.createTGrid({
        id: STANDALONE_ID,
        columns,
        dateRange: {
          start,
          end,
        },
        indexNames,
        itemsPerPage: itemsPerPage || itemsPerPageStore,
        itemsPerPageOptions,
        showCheckboxes,
      })
    );
    dispatch(
      tGridActions.initializeTGridSettings({
        id: STANDALONE_ID,
        defaultColumns: columns,
        footerText,
        sort,
        loadingText,
        unit,
        queryFields,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timelineContext = { timelineId: STANDALONE_ID };

  // Clear checkbox selection when new events are fetched
  useEffect(() => {
    dispatch(tGridActions.clearSelected({ id: STANDALONE_ID }));
    dispatch(
      tGridActions.setTGridSelectAll({
        id: STANDALONE_ID,
        selectAll: false,
      })
    );
  }, [nonDeletedEvents, dispatch]);

  return (
    <InspectButtonContainer data-test-subj="events-viewer-panel">
      <AlertsTableWrapper>
        {showFullLoading && <TGridLoading />}
        {canQueryTimeline ? (
          <TimelineContext.Provider value={timelineContext}>
            <EventsContainerLoading
              data-timeline-id={STANDALONE_ID}
              data-test-subj={`events-container-loading-${loading}`}
            >
              <UpdatedFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                <UpdatedFlexItem grow={false} $show={!loading}>
                  <InspectButton title={justTitle} inspect={inspect} loading={loading} />
                </UpdatedFlexItem>
                <UpdatedFlexItem grow={false} $show={!loading}>
                  <LastUpdatedAt updatedAt={updatedAt} />
                </UpdatedFlexItem>
              </UpdatedFlexGroup>

              {!hasAlerts && !loading && <TGridEmpty />}

              {hasAlerts && (
                <FullWidthFlexGroup direction="row" $visible={!graphEventId} gutterSize="none">
                  <ScrollableFlexItem grow={1}>
                    <StatefulBody
                      activePage={pageInfo.activePage}
                      browserFields={browserFields}
                      data={nonDeletedEvents}
                      defaultCellActions={defaultCellActions}
                      disabledCellActions={disabledCellActions}
                      filterQuery={filterQuery}
                      getRowRenderer={getRowRenderer}
                      hasAlertsCrud={hasAlertsCrud}
                      hasAlertsCrudPermissions={hasAlertsCrudPermissions}
                      id={STANDALONE_ID}
                      indexNames={indexNames}
                      isEventViewer={true}
                      itemsPerPageOptions={itemsPerPageOptionsStore}
                      leadingControlColumns={leadingControlColumns}
                      loadPage={loadPage}
                      refetch={refetch}
                      renderCellValue={renderCellValue}
                      rowRenderers={rowRenderers}
                      onRuleChange={onRuleChange}
                      pageSize={itemsPerPageStore}
                      tabType={TimelineTabs.query}
                      tableView="gridView"
                      totalItems={totalCountMinusDeleted}
                      totalSelectAllAlerts={totalSelectAllAlerts}
                      unit={unit}
                      filterStatus={filterStatus}
                      trailingControlColumns={trailingControlColumns}
                      showCheckboxes={showCheckboxes}
                      bulkActions={bulkActions}
                    />
                  </ScrollableFlexItem>
                </FullWidthFlexGroup>
              )}
            </EventsContainerLoading>
          </TimelineContext.Provider>
        ) : null}
      </AlertsTableWrapper>
    </InspectButtonContainer>
  );
};

export const TGridStandalone = React.memo(TGridStandaloneComponent);

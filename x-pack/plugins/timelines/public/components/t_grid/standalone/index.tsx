/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { Direction, EntityType } from '../../../../common/search_strategy';
import type { CoreStart } from '../../../../../../../src/core/public';
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
import {
  esQuery,
  Filter,
  Query,
  DataPublicPluginStart,
} from '../../../../../../../src/plugins/data/public';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { combineQueries, getCombinedFilterQuery } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import type { State } from '../../../store/t_grid';
import { useTimelineEvents } from '../../../container';
import { StatefulBody } from '../body';
import { LastUpdatedAt } from '../..';
import {
  SELECTOR_TIMELINE_GLOBAL_CONTAINER,
  UpdatedFlexItem,
  UpdatedFlexGroup,
  FullWidthFlexGroup,
} from '../styles';
import { InspectButton, InspectButtonContainer } from '../../inspect';
import { useFetchIndex } from '../../../container/source';
import { AddToCaseAction } from '../../actions/timeline/cases/add_to_case_action';
import { TGridLoading, TGridEmpty, TimelineContext } from '../shared';

export const EVENTS_VIEWER_HEADER_HEIGHT = 90; // px
const STANDALONE_ID = 'standalone-t-grid';
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
  appId: string;
  casePermissions: {
    crud: boolean;
    read: boolean;
  } | null;
  afterCaseSelection?: Function;
  columns: ColumnHeaderOptions[];
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  end: string;
  entityType?: EntityType;
  loadingText: React.ReactNode;
  filters: Filter[];
  footerText: React.ReactNode;
  filterStatus: AlertStatus;
  hasAlertsCrudPermissions: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
  height?: number;
  indexNames: string[];
  itemsPerPageOptions: number[];
  query: Query;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  setRefetch: (ref: () => void) => void;
  start: string;
  sort: SortColumnTimeline[];
  graphEventId?: string;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
  bulkActions?: BulkActionsProp;
  data?: DataPublicPluginStart;
  unit?: (total: number) => React.ReactNode;
}

const TGridStandaloneComponent: React.FC<TGridStandaloneProps> = ({
  afterCaseSelection,
  appId,
  casePermissions,
  columns,
  defaultCellActions,
  deletedEventIds,
  end,
  entityType = 'alerts',
  loadingText,
  filters,
  footerText,
  filterStatus,
  hasAlertsCrudPermissions,
  indexNames,
  itemsPerPageOptions,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  setRefetch,
  start,
  sort,
  graphEventId,
  leadingControlColumns,
  trailingControlColumns,
  data,
  unit,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [indexPatternsLoading, { browserFields, indexPatterns }] = useFetchIndex(indexNames);

  const getTGrid = useMemo(() => tGridSelectors.getTGridByIdSelector(), []);
  const {
    itemsPerPage: itemsPerPageStore,
    itemsPerPageOptions: itemsPerPageOptionsStore,
    queryFields,
    sort: sortStore,
    title,
  } = useDeepEqualSelector((state) => getTGrid(state, STANDALONE_ID ?? ''));

  useEffect(() => {
    dispatch(tGridActions.updateIsLoading({ id: STANDALONE_ID, isLoading: isQueryLoading }));
  }, [dispatch, isQueryLoading]);

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQuery.getEsQueryConfig(uiSettings),
        dataProviders: EMPTY_DATA_PROVIDERS,
        indexPattern: indexPatterns,
        browserFields,
        filters,
        kqlQuery: query,
        kqlMode: 'search',
        isEventViewer: true,
      }),
    [uiSettings, indexPatterns, browserFields, filters, query]
  );

  const canQueryTimeline = useMemo(
    () => !indexPatternsLoading && combinedQueries != null && !isEmpty(start) && !isEmpty(end),
    [indexPatternsLoading, combinedQueries, start, end]
  );

  const fields = useMemo(
    () => [
      ...columnsHeader.reduce<string[]>(
        (acc, c) => (c.linkField != null ? [...acc, c.id, c.linkField] : [...acc, c.id]),
        []
      ),
      ...(queryFields ?? []),
    ],
    [columnsHeader, queryFields]
  );

  const sortField = useMemo(
    () =>
      sortStore.map(({ columnId, columnType, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
      })),
    [sortStore]
  );

  const [
    loading,
    { consumers, events, updatedAt, loadPage, pageInfo, refetch, totalCount = 0, inspect },
  ] = useTimelineEvents({
    docValueFields: [],
    entityType,
    excludeEcsData: true,
    fields,
    filterQuery: combinedQueries!.filterQuery,
    id: STANDALONE_ID,
    indexNames,
    limit: itemsPerPageStore,
    sort: sortField,
    startDate: start,
    endDate: end,
    skip: !canQueryTimeline,
    data,
  });
  setRefetch(refetch);

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

  const activeCaseFlowId = useSelector((state: State) => tGridSelectors.activeCaseFlowId(state));
  const selectedEvent = useMemo(() => {
    const matchedEvent = events.find((event) => event.ecs._id === activeCaseFlowId);
    if (matchedEvent) {
      return matchedEvent;
    } else {
      return undefined;
    }
  }, [events, activeCaseFlowId]);

  const addToCaseActionProps = useMemo(() => {
    return {
      event: selectedEvent,
      casePermissions: casePermissions ?? null,
      appId,
      onClose: afterCaseSelection,
    };
  }, [appId, casePermissions, afterCaseSelection, selectedEvent]);

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQuery.getEsQueryConfig(uiSettings),
        dataProviders: EMPTY_DATA_PROVIDERS,
        indexPattern: indexPatterns,
        browserFields,
        filters,
        kqlQuery: query,
        kqlMode: 'search',
        isEventViewer: true,
        from: start,
        to: end,
      }),
    [uiSettings, indexPatterns, browserFields, filters, query, start, end]
  );

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

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
        itemsPerPage: itemsPerPageStore,
        itemsPerPageOptions,
        showCheckboxes: true,
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
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstUpdate = useRef(true);
  useEffect(() => {
    if (isFirstUpdate.current && !loading) {
      isFirstUpdate.current = false;
    }
  }, [loading]);
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
        {isFirstUpdate.current && <TGridLoading />}
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
                      filterQuery={filterQuery}
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
                    />
                  </ScrollableFlexItem>
                </FullWidthFlexGroup>
              )}
            </EventsContainerLoading>
          </TimelineContext.Provider>
        ) : null}
        <AddToCaseAction {...addToCaseActionProps} disableAlerts />
      </AlertsTableWrapper>
    </InspectButtonContainer>
  );
};

export const TGridStandalone = React.memo(TGridStandaloneComponent);

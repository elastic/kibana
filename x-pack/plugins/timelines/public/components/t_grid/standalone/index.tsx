/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiImage,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
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
import { calculateTotalPages, combineQueries, getCombinedFilterQuery } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import type { State } from '../../../store/t_grid';
import { useTimelineEvents } from '../../../container';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { LastUpdatedAt } from '../..';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER, UpdatedFlexGroup } from '../styles';
import { InspectButton, InspectButtonContainer } from '../../inspect';
import { useFetchIndex } from '../../../container/source';
import { AddToCaseAction } from '../../actions/timeline/cases/add_to_case_action';

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

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean; $color?: string }>`
  overflow: hidden;
  margin: 0;
  min-height: 490px;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  background: ${({ $color, theme }) =>
    $color ? theme.eui.euiPanelBackgroundColorModifiers[$color] : 'transparent'};
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
  height?: number;
  indexNames: string[];
  itemsPerPage: number;
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

const LoadingGrid: React.FC = () => (
  <FullWidthFlexGroup $visible={true} $color="subdued" alignItems="center" justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </FullWidthFlexGroup>
);

const EmptyGrid: React.FC = () => {
  const { http } = useKibana().services;

  return (
    <FullWidthFlexGroup
      $visible={true}
      $color="subdued"
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={true} style={{ maxWidth: 500 }}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="s">
                <EuiTitle>
                  <h3>
                    <FormattedMessage
                      id="xpack.timelines.tgrid.empty.title"
                      defaultMessage="No results match your search criteria"
                    />
                  </h3>
                </EuiTitle>
                <p>
                  <FormattedMessage
                    id="xpack.timelines.tgrid.empty.description"
                    defaultMessage="Try searching over a longer period of time or modifying your search"
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiImage
                size="200"
                alt="observability overview image"
                url={http!.basePath.prepend(
                  '/plugins/timelines/assets/illustration-product-no-results-magnifying-glass.svg'
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </FullWidthFlexGroup>
  );
};

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
  indexNames,
  itemsPerPage,
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
      sort.map(({ columnId, columnType, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
      })),
    [sort]
  );

  const [
    loading,
    { events, updatedAt, loadPage, pageInfo, refetch, totalCount = 0, inspect },
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

  const nonDeletedEvents = useMemo(() => events.filter((e) => !deletedEventIds.includes(e._id)), [
    deletedEventIds,
    events,
  ]);

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
        itemsPerPage,
        itemsPerPageOptions,
        showCheckboxes: true,
      })
    );
    dispatch(
      tGridActions.initializeTGridSettings({
        id: STANDALONE_ID,
        defaultColumns: columns,
        footerText,
        loadingText,
        unit,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InspectButtonContainer data-test-subj="events-viewer-panel">
      <AlertsTableWrapper>
        {canQueryTimeline ? (
          <>
            <EventsContainerLoading
              data-timeline-id={STANDALONE_ID}
              data-test-subj={`events-container-loading-${loading}`}
            >
              {loading ? (
                <LoadingGrid />
              ) : !hasAlerts ? (
                <EmptyGrid />
              ) : (
                <>
                  <UpdatedFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="baseline">
                    <EuiFlexItem grow={false}>
                      <InspectButton title={justTitle} inspect={inspect} loading={loading} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <LastUpdatedAt updatedAt={updatedAt} />
                    </EuiFlexItem>
                  </UpdatedFlexGroup>
                  <FullWidthFlexGroup direction="row" $visible={!graphEventId} gutterSize="none">
                    <ScrollableFlexItem grow={1}>
                      <StatefulBody
                        activePage={pageInfo.activePage}
                        browserFields={browserFields}
                        data={nonDeletedEvents}
                        defaultCellActions={defaultCellActions}
                        filterQuery={filterQuery}
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
                        querySize={pageInfo.querySize}
                        tabType={TimelineTabs.query}
                        tableView="gridView"
                        totalPages={calculateTotalPages({
                          itemsCount: totalCountMinusDeleted,
                          itemsPerPage: itemsPerPageStore,
                        })}
                        totalItems={totalCountMinusDeleted}
                        unit={unit}
                        filterStatus={filterStatus}
                        trailingControlColumns={trailingControlColumns}
                      />
                      <Footer
                        activePage={pageInfo.activePage}
                        data-test-subj="events-viewer-footer"
                        height={footerHeight}
                        id={STANDALONE_ID}
                        isLive={false}
                        isLoading={loading}
                        itemsCount={nonDeletedEvents.length}
                        itemsPerPage={itemsPerPageStore}
                        itemsPerPageOptions={itemsPerPageOptionsStore}
                        onChangePage={loadPage}
                        totalCount={totalCountMinusDeleted}
                      />
                    </ScrollableFlexItem>
                  </FullWidthFlexGroup>
                </>
              )}
            </EventsContainerLoading>
          </>
        ) : null}
        <AddToCaseAction {...addToCaseActionProps} />
      </AlertsTableWrapper>
    </InspectButtonContainer>
  );
};

export const TGridStandalone = React.memo(TGridStandaloneComponent);

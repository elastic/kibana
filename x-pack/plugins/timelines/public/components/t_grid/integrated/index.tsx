/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertConsumers as AlertConsumersTyped } from '@kbn/rule-data-utils';
// @ts-expect-error
import { AlertConsumers as AlertConsumersNonTyped } from '@kbn/rule-data-utils/target_node/alerts_as_data_rbac';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiProgress } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { Direction, EntityType } from '../../../../common/search_strategy';
import type { DocValueFields } from '../../../../common/search_strategy';
import type { CoreStart } from '../../../../../../../src/core/public';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { TGridCellAction, TimelineId, TimelineTabs } from '../../../../common/types/timeline';

import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  DataProvider,
  RowRenderer,
  AlertStatus,
} from '../../../../common/types/timeline';
import {
  esQuery,
  Filter,
  IIndexPattern,
  Query,
  DataPublicPluginStart,
} from '../../../../../../../src/plugins/data/public';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { defaultHeaders } from '../body/column_headers/default_headers';
import {
  calculateTotalPages,
  buildCombinedQuery,
  getCombinedFilterQuery,
  resolverIsShowing,
} from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { useTimelineEvents } from '../../../container';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER, UpdatedFlexGroup, UpdatedFlexItem } from '../styles';
import { Sort } from '../body/sort';
import { InspectButton, InspectButtonContainer } from '../../inspect';
import { SummaryViewSelector, ViewSelection } from '../event_rendered_view/selector';

const AlertConsumers: typeof AlertConsumersTyped = AlertConsumersNonTyped;

export const EVENTS_VIEWER_HEADER_HEIGHT = 90; // px

const TitleText = styled.span`
  margin-right: 12px;
`;

const StyledEuiPanel = styled(EuiPanel)<{ $isFullScreen: boolean }>`
  display: flex;
  flex-direction: column;
  position: relative;

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
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  docValueFields: DocValueFields[];
  end: string;
  entityType: EntityType;
  filters: Filter[];
  globalFullScreen: boolean;
  graphOverlay?: React.ReactNode;
  filterStatus?: AlertStatus;
  height?: number;
  id: TimelineId;
  indexNames: string[];
  indexPattern: IIndexPattern;
  isLive: boolean;
  isLoadingIndexPattern: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: 'filter' | 'search';
  query: Query;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  setGlobalFullScreen: (fullscreen: boolean) => void;
  start: string;
  sort: Sort[];
  additionalFilters: React.ReactNode;
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId: string | undefined;
  leadingControlColumns?: ControlColumnProps[];
  trailingControlColumns?: ControlColumnProps[];
  data?: DataPublicPluginStart;
  tGridEventRenderedViewEnabled: boolean;
  hasAlertsCrud: boolean;
  unit?: (n: number) => string;
}

const TGridIntegratedComponent: React.FC<TGridIntegratedProps> = ({
  browserFields,
  columns,
  defaultCellActions,
  dataProviders,
  deletedEventIds,
  docValueFields,
  end,
  entityType,
  filters,
  globalFullScreen,
  filterStatus,
  id,
  indexNames,
  indexPattern,
  isLive,
  isLoadingIndexPattern,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  setGlobalFullScreen,
  start,
  sort,
  additionalFilters,
  graphOverlay = null,
  graphEventId,
  leadingControlColumns,
  trailingControlColumns,
  tGridEventRenderedViewEnabled,
  data,
  hasAlertsCrud,
  unit,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(false);

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
    config: esQuery.getEsQueryConfig(uiSettings),
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

  const fields = useMemo(() => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])], [
    columnsHeader,
    queryFields,
  ]);

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
    { events, loadPage, pageInfo, refetch, totalCount = 0, inspect },
  ] = useTimelineEvents({
    // We rely on entityType to determine Events vs Alerts
    alertConsumers: SECURITY_ALERTS_CONSUMERS,
    docValueFields,
    entityType,
    fields,
    filterQuery: combinedQueries!.filterQuery,
    id,
    indexNames,
    limit: itemsPerPage,
    sort: sortField,
    startDate: start,
    endDate: end,
    skip: !canQueryTimeline,
    data,
  });

  const filterQuery = useMemo(() => {
    return getCombinedFilterQuery({
      config: esQuery.getEsQueryConfig(uiSettings),
      dataProviders,
      indexPattern,
      browserFields,
      filters,
      kqlQuery: query,
      kqlMode,
      isEventViewer: true,
      from: start,
      to: end,
    });
  }, [uiSettings, dataProviders, indexPattern, browserFields, filters, start, end, query, kqlMode]);

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const nonDeletedEvents = useMemo(() => events.filter((e) => !deletedEventIds.includes(e._id)), [
    deletedEventIds,
    events,
  ]);

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';

  return (
    <InspectButtonContainer>
      <StyledEuiPanel
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        data-test-subj="events-viewer-panel"
        $isFullScreen={globalFullScreen}
      >
        {loading && <EuiProgress size="xs" position="absolute" color="accent" />}

        {canQueryTimeline ? (
          <>
            <EventsContainerLoading
              data-timeline-id={id}
              data-test-subj={`events-container-loading-${loading}`}
            >
              <UpdatedFlexGroup gutterSize="m" justifyContent="flexEnd" alignItems={alignItems}>
                <UpdatedFlexItem grow={false} show={!loading}>
                  <InspectButton title={justTitle} inspect={inspect} loading={loading} />
                </UpdatedFlexItem>
                <UpdatedFlexItem grow={false} show={!loading}>
                  {!resolverIsShowing(graphEventId) && additionalFilters}
                </UpdatedFlexItem>
                {tGridEventRenderedViewEnabled && entityType === 'alerts' && (
                  <UpdatedFlexItem grow={false} show={!loading}>
                    <SummaryViewSelector viewSelected={tableView} onViewChange={setTableView} />
                  </UpdatedFlexItem>
                )}
              </UpdatedFlexGroup>

              <FullWidthFlexGroup
                $visible={!graphEventId && graphOverlay == null}
                gutterSize="none"
              >
                <ScrollableFlexItem grow={1}>
                  {nonDeletedEvents.length === 0 && loading === false ? (
                    <EuiEmptyPrompt
                      title={
                        <h2>
                          <FormattedMessage
                            id="xpack.timelines.tGrid.noResultsMatchSearchCriteriaTitle"
                            defaultMessage="No results match your search criteria"
                          />
                        </h2>
                      }
                      titleSize="s"
                      body={
                        <p>
                          <FormattedMessage
                            id="xpack.timelines.tGrid.noResultsMatchSearchCriteriaDescription"
                            defaultMessage="Try searching over a longer period of time or modifying your search."
                          />
                        </p>
                      }
                    />
                  ) : (
                    <>
                      <StatefulBody
                        hasAlertsCrud={hasAlertsCrud}
                        activePage={pageInfo.activePage}
                        browserFields={browserFields}
                        filterQuery={filterQuery}
                        data={nonDeletedEvents}
                        defaultCellActions={defaultCellActions}
                        id={id}
                        isEventViewer={true}
                        itemsPerPageOptions={itemsPerPageOptions}
                        loadPage={loadPage}
                        onRuleChange={onRuleChange}
                        querySize={pageInfo.querySize}
                        renderCellValue={renderCellValue}
                        rowRenderers={rowRenderers}
                        tabType={TimelineTabs.query}
                        tableView={tableView}
                        totalPages={calculateTotalPages({
                          itemsCount: totalCountMinusDeleted,
                          itemsPerPage,
                        })}
                        totalItems={totalCountMinusDeleted}
                        unit={unit}
                        filterStatus={filterStatus}
                        leadingControlColumns={leadingControlColumns}
                        trailingControlColumns={trailingControlColumns}
                        refetch={refetch}
                        indexNames={indexNames}
                      />
                      {tableView === 'gridView' && (
                        <Footer
                          activePage={pageInfo.activePage}
                          data-test-subj="events-viewer-footer"
                          height={footerHeight}
                          id={id}
                          isLive={isLive}
                          isLoading={loading}
                          itemsCount={nonDeletedEvents.length}
                          itemsPerPage={itemsPerPage}
                          itemsPerPageOptions={itemsPerPageOptions}
                          onChangePage={loadPage}
                          totalCount={totalCountMinusDeleted}
                        />
                      )}
                    </>
                  )}
                </ScrollableFlexItem>
              </FullWidthFlexGroup>
            </EventsContainerLoading>
          </>
        ) : null}
      </StyledEuiPanel>
    </InspectButtonContainer>
  );
};

export const TGridIntegrated = React.memo(TGridIntegratedComponent);

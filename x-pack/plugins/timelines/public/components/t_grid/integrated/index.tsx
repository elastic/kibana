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
import * as i18n from '../translations';
import { Sort } from '../body/sort';
import { InspectButton, InspectButtonContainer } from '../../inspect';
import { SummaryViewSelector, ViewSelection } from '../event_rendered_view/selector';

const AlertConsumers: typeof AlertConsumersTyped = AlertConsumersNonTyped;

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
  additionalFilters: React.ReactNode;
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  data?: DataPublicPluginStart;
  dataProviders: DataProvider[];
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  docValueFields: DocValueFields[];
  end: string;
  entityType: EntityType;
  filters: Filter[];
  filterStatus?: AlertStatus;
  globalFullScreen: boolean;
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId: string | undefined;
  graphOverlay?: React.ReactNode;
  hasAlertsCrud: boolean;
  height?: number;
  id: TimelineId;
  indexNames: string[];
  indexPattern: IIndexPattern;
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
  sort: Sort[];
  start: string;
  tGridEventRenderedViewEnabled: boolean;
  trailingControlColumns?: ControlColumnProps[];
  unit?: (n: number) => string;
}

const TGridIntegratedComponent: React.FC<TGridIntegratedProps> = ({
  additionalFilters,
  browserFields,
  columns,
  data,
  dataProviders,
  defaultCellActions,
  deletedEventIds,
  docValueFields,
  end,
  entityType,
  filters,
  filterStatus,
  globalFullScreen,
  graphEventId,
  graphOverlay = null,
  hasAlertsCrud,
  id,
  indexNames,
  indexPattern,
  isLive,
  isLoadingIndexPattern,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  leadingControlColumns,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  sort,
  start,
  tGridEventRenderedViewEnabled,
  trailingControlColumns,
  tGridEventRenderedViewEnabled,
  unit,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  const [tableView, setTableView] = useState<ViewSelection>('gridView');
  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const unit = useMemo(() => (n: number) => i18n.ALERTS_UNIT(n), []);
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
    data,
    docValueFields,
    endDate: end,
    entityType,
    fields,
    filterQuery: combinedQueries!.filterQuery,
    id,
    indexNames,
    limit: itemsPerPage,
    skip: !canQueryTimeline,
    sort: sortField,
    startDate: start,
  });

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQuery.getEsQueryConfig(uiSettings),
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

        {graphOverlay}
        {canQueryTimeline ? (
          <>
            <EventsContainerLoading
              data-timeline-id={id}
              data-test-subj={`events-container-loading-${loading}`}
            >
              <UpdatedFlexGroup gutterSize="m" justifyContent="flexEnd" alignItems={alignItems}>
                <UpdatedFlexItem grow={false} $show={!loading}>
                  <InspectButton title={justTitle} inspect={inspect} loading={loading} />
                </UpdatedFlexItem>
                <UpdatedFlexItem grow={false} $show={!loading}>
                  {!resolverIsShowing(graphEventId) && additionalFilters}
                </UpdatedFlexItem>
                {tGridEventRenderedViewEnabled && entityType === 'alerts' && (
                  <UpdatedFlexItem grow={false} $show={!loading}>
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
                        activePage={pageInfo.activePage}
                        browserFields={browserFields}
                        data={nonDeletedEvents}
                        defaultCellActions={defaultCellActions}
                        filterQuery={filterQuery}
                        filterStatus={filterStatus}
                        hasAlertsCrud={hasAlertsCrud}
                        id={id}
                        indexNames={indexNames}
                        isEventViewer={true}
                        itemsPerPageOptions={itemsPerPageOptions}
                        leadingControlColumns={leadingControlColumns}
                        loadPage={loadPage}
                        onRuleChange={onRuleChange}
                        querySize={pageInfo.querySize}
                        refetch={refetch}
                        renderCellValue={renderCellValue}
                        rowRenderers={rowRenderers}
                        tableView={tableView}
                        tabType={TimelineTabs.query}
                        totalItems={totalCountMinusDeleted}
                        totalPages={calculateTotalPages({
                          itemsCount: totalCountMinusDeleted,
                          itemsPerPage,
                        })}
                        trailingControlColumns={trailingControlColumns}
                        unit={unit}
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

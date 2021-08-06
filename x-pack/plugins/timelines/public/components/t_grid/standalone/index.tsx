/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertConsumers } from '@kbn/rule-data-utils/target/alerts_as_data_rbac';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { Direction } from '../../../../common/search_strategy';
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
import { calculateTotalPages, combineQueries, resolverIsShowing } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { useTimelineEvents } from '../../../container';
import { HeaderSection } from '../header_section';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { LastUpdatedAt } from '../..';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER, UpdatedFlexItem } from '../styles';
import * as i18n from '../translations';
import { InspectButtonContainer } from '../../inspect';
import { useFetchIndex } from '../../../container/source';

export const EVENTS_VIEWER_HEADER_HEIGHT = 90; // px
const COMPACT_HEADER_HEIGHT = 36; // px
const STANDALONE_ID = 'standalone-t-grid';
const EMPTY_DATA_PROVIDERS: DataProvider[] = [];

const TitleText = styled.span`
  margin-right: 12px;
`;

const StyledEuiPanel = styled(EuiPanel)<{ $isFullScreen: boolean }>`
  display: flex;
  flex-direction: column;

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
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  min-height: 490px;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

/**
 * Hides stateful headerFilterGroup implementations, but prevents the component
 * from being unmounted, to preserve the state of the component
 */
const HeaderFilterGroupWrapper = styled.header<{ show: boolean }>`
  ${({ show }) => (show ? '' : 'visibility: hidden;')}
`;

export interface TGridStandaloneProps {
  alertConsumers: AlertConsumers[];
  columns: ColumnHeaderOptions[];
  defaultCellActions?: TGridCellAction[];
  deletedEventIds: Readonly<string[]>;
  end: string;
  loadingText: React.ReactNode;
  filters: Filter[];
  footerText: React.ReactNode;
  headerFilterGroup?: React.ReactNode;
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
  unit: (total: number) => React.ReactNode;
}
const basicUnit = (n: number) => i18n.UNIT(n);

const TGridStandaloneComponent: React.FC<TGridStandaloneProps> = ({
  alertConsumers,
  columns,
  defaultCellActions,
  deletedEventIds,
  end,
  loadingText,
  filters,
  footerText,
  headerFilterGroup,
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
  sort: initialSort,
  graphEventId,
  leadingControlColumns,
  trailingControlColumns,
  data,
  unit = basicUnit,
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
    sort: sortFromRedux,
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

  const [sort, setSort] = useState(initialSort);
  useEffect(() => setSort(sortFromRedux), [sortFromRedux]);

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
    alertConsumers,
    docValueFields: [],
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

  const nonDeletedEvents = useMemo(() => events.filter((e) => !deletedEventIds.includes(e._id)), [
    deletedEventIds,
    events,
  ]);

  const HeaderSectionContent = useMemo(
    () =>
      headerFilterGroup && (
        <HeaderFilterGroupWrapper
          data-test-subj="header-filter-group-wrapper"
          show={!resolverIsShowing(graphEventId)}
        >
          {headerFilterGroup}
        </HeaderFilterGroupWrapper>
      ),
    [headerFilterGroup, graphEventId]
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
        sort,
        unit,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InspectButtonContainer>
      <StyledEuiPanel data-test-subj="events-viewer-panel" $isFullScreen={false}>
        {canQueryTimeline ? (
          <>
            <HeaderSection
              id={!resolverIsShowing(graphEventId) ? STANDALONE_ID : undefined}
              inspect={inspect}
              loading={loading}
              height={
                headerFilterGroup == null ? COMPACT_HEADER_HEIGHT : EVENTS_VIEWER_HEADER_HEIGHT
              }
              title={justTitle}
            >
              {HeaderSectionContent}
            </HeaderSection>

            <EventsContainerLoading
              data-timeline-id={STANDALONE_ID}
              data-test-subj={`events-container-loading-${loading}`}
            >
              <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
                <UpdatedFlexItem grow={false} show={!loading}>
                  <LastUpdatedAt updatedAt={updatedAt} />
                </UpdatedFlexItem>
              </EuiFlexGroup>

              <FullWidthFlexGroup direction="row" $visible={!graphEventId} gutterSize="none">
                <ScrollableFlexItem grow={1}>
                  <StatefulBody
                    activePage={pageInfo.activePage}
                    browserFields={browserFields}
                    data={nonDeletedEvents}
                    defaultCellActions={defaultCellActions}
                    id={STANDALONE_ID}
                    isEventViewer={true}
                    loadPage={loadPage}
                    onRuleChange={onRuleChange}
                    renderCellValue={renderCellValue}
                    rowRenderers={rowRenderers}
                    tabType={TimelineTabs.query}
                    totalPages={calculateTotalPages({
                      itemsCount: totalCountMinusDeleted,
                      itemsPerPage: itemsPerPageStore,
                    })}
                    totalItems={totalCountMinusDeleted}
                    unit={unit}
                    filterStatus={filterStatus}
                    leadingControlColumns={leadingControlColumns}
                    trailingControlColumns={trailingControlColumns}
                    refetch={refetch}
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
            </EventsContainerLoading>
          </>
        ) : null}
      </StyledEuiPanel>
    </InspectButtonContainer>
  );
};

export const TGridStandalone = React.memo(TGridStandaloneComponent);

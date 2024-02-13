/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlyoutHeader, EuiBadge } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';
import { FilterManager } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { DataLoadingState } from '@kbn/unified-data-table';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../store';
import type { Direction, TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers';
import { useKibana } from '../../../../common/lib/kibana';
import { QueryTabHeader } from './header';
import { combineQueries } from '../../../../common/lib/kuery';
import { TimelineRefetch } from '../refetch_timeline';
import type {
  KueryFilterQueryKind,
  RowRenderer,
  ToggleDetailPanel,
} from '../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../store/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../store/model';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useLicense } from '../../../../common/hooks/use_license';
import { UnifiedTimelineComponent } from '../unified_components';
import { defaultUdtHeaders } from '../unified_components/default_headers';
import { StyledTableFlexGroup, StyledTableFlexItem } from '../unified_components/styles';
import { defaultHeaders } from '../body/column_headers/default_headers';

const TimelineHeaderContainer = styled.div`
  margin-top: 6px;
`;

const QueryTabHeaderContainer = styled.div`
  width: 100%;
`;

QueryTabHeaderContainer.displayName = 'TimelineHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: stretch;
  box-shadow: none;
  display: flex;
  flex-direction: column;
`;

const SourcererFlex = styled(EuiFlexItem)`
  align-items: flex-end;
`;

SourcererFlex.displayName = 'SourcererFlex';

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

VerticalRule.displayName = 'VerticalRule';

const EventsCountBadge = styled(EuiBadge)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const isTimerangeSame = (prevProps: Props, nextProps: Props) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

const compareQueryProps = (prevProps: Props, nextProps: Props) =>
  prevProps.kqlMode === nextProps.kqlMode &&
  prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
  deepEqual(prevProps.filters, nextProps.filters);

interface OwnProps {
  rowRenderers: RowRenderer[];
  timelineId: string;
}

export type Props = OwnProps & PropsFromRedux;

export const NewQueryTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  dataProviders,
  end,
  expandedDetail,
  filters,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  kqlQueryLanguage,
  onEventClosed,
  rowRenderers,
  show,
  showCallOutUnauthorizedMsg,
  showExpandedDetails,
  start,
  status,
  sort,
  timerangeKind,
}) => {
  const dispatch = useDispatch();
  const [pageRows, setPageRows] = useState<TimelineItem[][]>([]);
  const rows = useMemo(() => pageRows.flat(), [pageRows]);
  const { portalNode: timelineEventsCountPortalNode } = useTimelineEventsCountPortal();
  const {
    browserFields,
    dataViewId,
    loading: isSourcererLoading,
    indexPattern,
    runtimeMappings,
    // important to get selectedPatterns from useSourcererDataView
    // in order to include the exclude filters in the search that are not stored in the timeline
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const { uiSettings } = useKibana().services;
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const { sampleSize = 10, filterManager: activeFilterManager } = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const filterManager = useMemo(
    () => activeFilterManager ?? new FilterManager(uiSettings),
    [activeFilterManager, uiSettings]
  );

  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const kqlQuery: {
    query: string;
    language: KueryFilterQueryKind;
  } = useMemo(
    () => ({ query: kqlQueryExpression.trim(), language: kqlQueryLanguage }),
    [kqlQueryExpression, kqlQueryLanguage]
  );

  const combinedQueries = combineQueries({
    config: esQueryConfig,
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery,
    kqlMode,
  });

  useInvalidFilterQuery({
    id: timelineId,
    filterQuery: combinedQueries?.filterQuery,
    kqlError: combinedQueries?.kqlError,
    query: kqlQuery,
    startDate: start,
    endDate: end,
  });

  const isBlankTimeline: boolean =
    isEmpty(dataProviders) &&
    isEmpty(filters) &&
    isEmpty(kqlQuery.query) &&
    combinedQueries?.filterQuery === undefined;

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      isSourcererLoading != null &&
      !isSourcererLoading &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      combinedQueries?.filterQuery !== undefined,
    [combinedQueries, end, isSourcererLoading, start]
  );

  const columnsHeader = useMemo(() => {
    return isEmpty(columns) ? defaultUdtHeaders : columns;
  }, [columns]);

  const defaultColumns = useMemo(() => {
    return columnsHeader.map((c) => c.id);
  }, [columnsHeader]);

  const getTimelineQueryFields = useCallback(() => {
    return [...defaultColumns, ...requiredFieldsForActions];
  }, [defaultColumns]);

  const timelineQuerySortField = sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
    field: columnId,
    direction: sortDirection as Direction,
    esTypes: esTypes ?? [],
    type: columnType,
  }));

  const useDiscoverComponentsInTimeline = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  useEffect(() => {
    dispatch(
      timelineActions.initializeTimelineSettings({
        filterManager,
        id: timelineId,
        defaultColumns: useDiscoverComponentsInTimeline ? defaultUdtHeaders : defaultHeaders,
      })
    );
  }, [dispatch, filterManager, timelineId, useDiscoverComponentsInTimeline]);

  const [
    dataLoadingState,
    { events, inspect, totalCount, refetch, loadPage, pageInfo, refreshedAt },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    fields: getTimelineQueryFields(),
    filterQuery: combinedQueries?.filterQuery,
    id: timelineId,
    indexNames: selectedPatterns,
    language: kqlQuery.language,
    limit: sampleSize,
    runtimeMappings,
    skip: !canQueryTimeline,
    sort: timelineQuerySortField,
    startDate: start,
    timerangeKind,
  });

  const isQueryLoading = useMemo(() => {
    return (
      dataLoadingState === DataLoadingState.loading ||
      dataLoadingState === DataLoadingState.loadingMore
    );
  }, [dataLoadingState]);

  useEffect(() => {
    setPageRows((currentPageRows) => {
      if (pageInfo.activePage !== 0 && currentPageRows[pageInfo.activePage]?.length) {
        return currentPageRows;
      }
      const newPageRows = pageInfo.activePage === 0 ? [] : [...currentPageRows];
      newPageRows[pageInfo.activePage] = events;
      return newPageRows;
    });
  }, [events, pageInfo.activePage]);

  useEffect(() => {
    dispatch(
      timelineActions.updateIsLoading({
        id: timelineId,
        isLoading: isQueryLoading || isSourcererLoading,
      })
    );
  }, [isSourcererLoading, timelineId, dispatch, dataLoadingState, isQueryLoading]);

  const header = useMemo(
    () => (
      <StyledEuiFlyoutHeader data-test-subj={`${activeTab}-tab-flyout-header`} hasBorder={false}>
        <TimelineHeaderContainer data-test-subj="timelineHeader">
          <QueryTabHeader
            filterManager={filterManager}
            show={show && activeTab === TimelineTabs.query}
            showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
            status={status}
            timelineId={timelineId}
          />
        </TimelineHeaderContainer>
      </StyledEuiFlyoutHeader>
    ),
    [activeTab, filterManager, show, showCallOutUnauthorizedMsg, status, timelineId]
  );

  // NOTE: The timeline is blank after browser FORWARD navigation (after using back button to navigate to
  // the previous page from the timeline), yet we still see total count. This is because the timeline
  // is not getting refreshed when using browser navigation.
  const showEventsCountBadge = !isBlankTimeline && totalCount >= 0;

  return (
    <>
      <InPortal node={timelineEventsCountPortalNode}>
        {showEventsCountBadge ? (
          <EventsCountBadge data-test-subj="query_tab_events_count_badge">
            {totalCount}
          </EventsCountBadge>
        ) : null}
      </InPortal>
      <TimelineRefetch
        id={`${timelineId}-${TimelineTabs.query}`}
        inputId={InputsModelId.timeline}
        inspect={inspect}
        loading={isQueryLoading}
        refetch={refetch}
        skip={!canQueryTimeline}
      />
      <StyledTableFlexGroup direction="column" gutterSize="s">
        <StyledTableFlexItem grow={false}>{header}</StyledTableFlexItem>
        <StyledTableFlexItem>
          <RootDragDropProvider>
            <UnifiedTimelineComponent
              columns={columnsHeader}
              rowRenderers={rowRenderers}
              timelineId={timelineId}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={itemsPerPageOptions}
              sort={sort}
              events={rows}
              refetch={refetch}
              dataLoadingState={dataLoadingState}
              totalCount={isBlankTimeline ? 0 : totalCount}
              onEventClosed={onEventClosed}
              expandedDetail={expandedDetail}
              showExpandedDetails={showExpandedDetails}
              onChangePage={loadPage}
              activeTab={activeTab}
              updatedAt={refreshedAt}
              isTextBasedQuery={false}
            />
          </RootDragDropProvider>
        </StyledTableFlexItem>
      </StyledTableFlexGroup>
    </>
  );
};

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      activeTab,
      columns,
      dataProviders,
      expandedDetail,
      filters,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      show,
      sort,
      status,
      timelineType,
    } = timeline;
    const kqlQueryTimeline = getKqlQueryTimeline(state, timelineId);
    const timelineFilter = kqlMode === 'filter' ? filters || [] : [];

    // return events on empty search
    const kqlQueryExpression =
      isEmpty(dataProviders) &&
      isEmpty(kqlQueryTimeline?.expression ?? '') &&
      timelineType === 'template'
        ? ' '
        : kqlQueryTimeline?.expression ?? '';

    const kqlQueryLanguage =
      isEmpty(dataProviders) && timelineType === 'template'
        ? 'kuery'
        : kqlQueryTimeline?.kind ?? 'kuery';

    return {
      activeTab,
      columns,
      dataProviders,
      end: input.timerange.to,
      expandedDetail,
      filters: timelineFilter,
      timelineId,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      kqlQueryLanguage,
      showCallOutUnauthorizedMsg: getShowCallOutUnauthorizedMsg(state),
      show,
      showExpandedDetails:
        !!expandedDetail[TimelineTabs.query] && !!expandedDetail[TimelineTabs.query]?.panelView,
      sort,
      start: input.timerange.from,
      status,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onEventClosed: (args: ToggleDetailPanel) => {
    dispatch(timelineActions.toggleDetailPanel(args));
  },
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const NewQueryTabContent = connector(
  React.memo(
    NewQueryTabContentComponent,
    (prevProps, nextProps) =>
      compareQueryProps(prevProps, nextProps) &&
      prevProps.activeTab === nextProps.activeTab &&
      isTimerangeSame(prevProps, nextProps) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.show === nextProps.show &&
      prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.status === nextProps.status &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { NewQueryTabContent as default };

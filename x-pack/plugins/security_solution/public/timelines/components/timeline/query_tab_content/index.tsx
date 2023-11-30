/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback } from 'react';
import { css } from '@emotion/react';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';
import { FilterManager } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { ControlColumnProps } from '../../../../../common/types';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import type { CellValueElementProps } from '../cell_rendering';
import type { Direction, TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { QueryTabHeader } from './header';
import { calculateTotalPages } from '../helpers';
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
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../store/timeline/model';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { DetailsPanel } from '../../side_panel';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';
import { getDefaultControlColumn } from '../body/control_columns';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useLicense } from '../../../../common/hooks/use_license';
import { HeaderActions } from '../../../../common/components/header_actions/header_actions';

const isTimerangeSame = (prevProps: Props, nextProps: Props) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

const compareQueryProps = (prevProps: Props, nextProps: Props) =>
  prevProps.kqlMode === nextProps.kqlMode &&
  prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
  deepEqual(prevProps.filters, nextProps.filters);

interface OwnProps {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: string;
}

const EMPTY_EVENTS: TimelineItem[] = [];

export type Props = OwnProps & PropsFromRedux;

const trailingControlColumns: ControlColumnProps[] = []; // stable reference

export const QueryTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  dataProviders,
  end,
  expandedDetail,
  filters,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  kqlQueryLanguage,
  onEventClosed,
  renderCellValue,
  rowRenderers,
  show,
  showCallOutUnauthorizedMsg,
  showExpandedDetails,
  start,
  status,
  sort,
  timerangeKind,
}) => {
  const { euiTheme } = useEuiTheme();
  const dispatch = useDispatch();
  const { portalNode: timelineEventsCountPortalNode } = useTimelineEventsCountPortal();
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
  const {
    browserFields,
    dataViewId,
    loading: loadingSourcerer,
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
  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const activeFilterManager = currentTimeline.filterManager;
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
      loadingSourcerer != null &&
      !loadingSourcerer &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      combinedQueries?.filterQuery !== undefined,
    [combinedQueries, end, loadingSourcerer, start]
  );

  const getTimelineQueryFields = () => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    const columnFields = columnsHeader.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  };

  const timelineQuerySortField = sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
    field: columnId,
    direction: sortDirection as Direction,
    esTypes: esTypes ?? [],
    type: columnType,
  }));

  useEffect(() => {
    dispatch(
      timelineActions.initializeTimelineSettings({
        filterManager,
        id: timelineId,
      })
    );
  }, [dispatch, filterManager, timelineId]);

  const [
    isQueryLoading,
    { events, inspect, totalCount, pageInfo, loadPage, refreshedAt, refetch },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    fields: getTimelineQueryFields(),
    filterQuery: combinedQueries?.filterQuery,
    id: timelineId,
    indexNames: selectedPatterns,
    language: kqlQuery.language,
    limit: itemsPerPage,
    runtimeMappings,
    skip: !canQueryTimeline,
    sort: timelineQuerySortField,
    startDate: start,
    timerangeKind,
  });

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.query, id: timelineId });

    if (
      expandedDetail[TimelineTabs.query]?.panelView &&
      timelineId === TimelineId.active &&
      showExpandedDetails
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [onEventClosed, timelineId, expandedDetail, showExpandedDetails]);

  useEffect(() => {
    dispatch(
      timelineActions.updateIsLoading({
        id: timelineId,
        isLoading: isQueryLoading || loadingSourcerer,
      })
    );
  }, [loadingSourcerer, timelineId, isQueryLoading, dispatch]);

  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: HeaderActions,
      })),
    [ACTION_BUTTON_COUNT]
  );

  // NOTE: The timeline is blank after browser FORWARD navigation (after using back button to navigate to
  // the previous page from the timeline), yet we still see total count. This is because the timeline
  // is not getting refreshed when using browser navigation.
  const showEventsCountBadge = !isBlankTimeline && totalCount >= 0;

  return (
    <>
      <InPortal node={timelineEventsCountPortalNode}>
        {showEventsCountBadge ? (
          <EuiBadge
            css={css`
              margin-left: ${euiTheme.size.s};
            `}
          >
            {totalCount}
          </EuiBadge>
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
      <EuiFlexGroup
        gutterSize="none"
        css={css`
          width: 100%;
        `}
      >
        <EuiFlexItem
          grow={2}
          css={css`
            overflow: hidden;
          `}
        >
          <EuiFlexGroup
            direction="column"
            justifyContent="spaceBetween"
            gutterSize="none"
            css={css`
              padding: ${euiTheme.size.m};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="none">
                {timelineFullScreen && setTimelineFullScreen != null && (
                  <EuiFlexItem>
                    <EuiFlexGroup>
                      <ExitFullScreen
                        fullScreen={timelineFullScreen}
                        setFullScreen={setTimelineFullScreen}
                      />
                    </EuiFlexGroup>
                    <EuiSpacer size="s" />
                  </EuiFlexItem>
                )}
                <EuiFlexItem data-test-subj={`${TimelineTabs.query}-tab-header`} grow={false}>
                  <QueryTabHeader
                    filterManager={filterManager}
                    show={show && activeTab === TimelineTabs.query}
                    showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
                    status={status}
                    timelineId={timelineId}
                  />
                </EuiFlexItem>
                <EuiFlexItem data-test-subj={`${TimelineTabs.query}-tab-body`}>
                  <StatefulBody
                    activePage={pageInfo.activePage}
                    browserFields={browserFields}
                    data={isBlankTimeline ? EMPTY_EVENTS : events}
                    id={timelineId}
                    refetch={refetch}
                    renderCellValue={renderCellValue}
                    rowRenderers={rowRenderers}
                    sort={sort}
                    tabType={TimelineTabs.query}
                    totalPages={calculateTotalPages({
                      itemsCount: totalCount,
                      itemsPerPage,
                    })}
                    leadingControlColumns={leadingControlColumns}
                    trailingControlColumns={trailingControlColumns}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false} data-test-subj={`${TimelineTabs.query}-tab-flyout-footer`}>
              {!isBlankTimeline && (
                <Footer
                  activePage={pageInfo?.activePage ?? 0}
                  data-test-subj="timeline-footer"
                  updatedAt={refreshedAt}
                  height={footerHeight}
                  id={timelineId}
                  isLive={isLive}
                  isLoading={isQueryLoading || loadingSourcerer}
                  itemsCount={isBlankTimeline ? 0 : events.length}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={itemsPerPageOptions}
                  onChangePage={loadPage}
                  totalCount={isBlankTimeline ? 0 : totalCount}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {showExpandedDetails && (
          <EuiFlexItem grow={1}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem
                grow={false}
                css={css`
                  width: 2px;
                  background-color: ${euiTheme.colors.lightShade};
                `}
              />
              <EuiFlexItem
                css={css`
                  padding: ${euiTheme.size.m};
                `}
              >
                <DetailsPanel
                  browserFields={browserFields}
                  handleOnPanelClosed={handleOnPanelClosed}
                  runtimeMappings={runtimeMappings}
                  tabType={TimelineTabs.query}
                  scopeId={timelineId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
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

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  onEventClosed: (args: ToggleDetailPanel) => {
    dispatch(timelineActions.toggleDetailPanel(args));
  },
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const QueryTabContent = connector(
  React.memo(
    QueryTabContentComponent,
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
export { QueryTabContent as default };

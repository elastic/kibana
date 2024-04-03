/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiBadge,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';

import { DataLoadingState } from '@kbn/unified-data-table';
import type { ControlColumnProps } from '../../../../../common/types';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { timelineActions, timelineSelectors } from '../../../store';
import type { CellValueElementProps } from '../cell_rendering';
import type { TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { calculateTotalPages } from '../helpers';
import { TimelineRefetch } from '../refetch_timeline';
import type { RowRenderer, ToggleDetailPanel } from '../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../store/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useEqlEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../store/model';
import { TimelineDatePickerLock } from '../date_picker_lock';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { DetailsPanel } from '../../side_panel';
import { EqlQueryBarTimeline } from '../query_bar/eql';
import { getDefaultControlColumn } from '../body/control_columns';
import type { Sort } from '../body/sort';
import { Sourcerer } from '../../../../common/components/sourcerer';
import { useLicense } from '../../../../common/hooks/use_license';
import { HeaderActions } from '../../../../common/components/header_actions/header_actions';

const EqlTabHeaderContainer = styled.div`
  margin-top: ${(props) => props.theme.eui.euiSizeS};
  width: 100%;
`;

EqlTabHeaderContainer.displayName = 'EqlTabHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: stretch;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  margin-top: ${({ theme }) => theme.eui.euiSizeM}
  padding: 0;

  &.euiFlyoutHeader {
    ${({ theme }) => `padding: ${theme.eui.euiSizeS} 0 0 0;`}
  }
`;

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;

  .euiFlyoutBody__overflow {
    overflow: hidden;
    mask-image: none;
  }

  .euiFlyoutBody__overflowContent {
    padding: 0;
    height: 100%;
    display: flex;
  }
`;

const StyledEuiFlyoutFooter = styled(EuiFlyoutFooter)`
  background: none;
  padding: 0;

  &.euiFlyoutFooter {
    ${({ theme }) => `padding: ${theme.eui.euiSizeS} 0 0 0;`}
  }
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
`;

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

interface OwnProps {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: string;
}

const EMPTY_EVENTS: TimelineItem[] = [];

export type Props = OwnProps & PropsFromRedux;

const NO_SORTING: Sort[] = [];

const trailingControlColumns: ControlColumnProps[] = []; // stable reference

export const EqlTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  end,
  eqlOptions,
  expandedDetail,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  onEventClosed,
  renderCellValue,
  rowRenderers,
  showExpandedDetails,
  start,
  timerangeKind,
}) => {
  const dispatch = useDispatch();
  const { query: eqlQuery = '', ...restEqlOption } = eqlOptions;
  const { portalNode: eqlEventsCountPortalNode } = useEqlEventsCountPortal();
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
  const {
    browserFields,
    dataViewId,
    loading: loadingSourcerer,
    runtimeMappings,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

  const isBlankTimeline: boolean = isEmpty(eqlQuery);

  const canQueryTimeline = () =>
    loadingSourcerer != null &&
    !loadingSourcerer &&
    !isEmpty(start) &&
    !isEmpty(end) &&
    !isBlankTimeline;

  const getTimelineQueryFields = () => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    const columnFields = columnsHeader.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  };

  const [
    queryLoadingState,
    { events, inspect, totalCount, pageInfo, loadPage, refreshedAt, refetch },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    eqlOptions: restEqlOption,
    fields: getTimelineQueryFields(),
    filterQuery: eqlQuery ?? '',
    id: timelineId,
    indexNames: selectedPatterns,
    language: 'eql',
    limit: itemsPerPage,
    runtimeMappings,
    skip: !canQueryTimeline(),
    startDate: start,
    timerangeKind,
  });

  const isQueryLoading = useMemo(
    () =>
      queryLoadingState === DataLoadingState.loading ||
      queryLoadingState === DataLoadingState.loadingMore,
    [queryLoadingState]
  );

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.eql, id: timelineId });
  }, [onEventClosed, timelineId]);

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

  return (
    <>
      <InPortal node={eqlEventsCountPortalNode}>
        {totalCount >= 0 ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
      </InPortal>
      <TimelineRefetch
        id={`${timelineId}-${TimelineTabs.eql}`}
        inputId={InputsModelId.timeline}
        inspect={inspect}
        loading={isQueryLoading}
        refetch={refetch}
      />
      <FullWidthFlexGroup>
        <ScrollableFlexItem grow={2}>
          <StyledEuiFlyoutHeader
            data-test-subj={`${activeTab}-tab-flyout-header`}
            hasBorder={false}
          >
            <EuiFlexGroup
              className="euiScrollBar"
              alignItems="flexStart"
              gutterSize="s"
              data-test-subj="timeline-date-picker-container"
              responsive={false}
            >
              {timelineFullScreen && setTimelineFullScreen != null && (
                <ExitFullScreen
                  fullScreen={timelineFullScreen}
                  setFullScreen={setTimelineFullScreen}
                />
              )}
              <EuiFlexItem grow={false}>
                {activeTab === TimelineTabs.eql && (
                  <Sourcerer scope={SourcererScopeName.timeline} />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <SuperDatePicker width="auto" id={InputsModelId.timeline} timelineId={timelineId} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TimelineDatePickerLock />
              </EuiFlexItem>
            </EuiFlexGroup>
          </StyledEuiFlyoutHeader>
          <EqlTabHeaderContainer data-test-subj="timelineHeader">
            <EqlQueryBarTimeline timelineId={timelineId} />
          </EqlTabHeaderContainer>

          <EventDetailsWidthProvider>
            <StyledEuiFlyoutBody
              data-test-subj={`${TimelineTabs.eql}-tab-flyout-body`}
              className="timeline-flyout-body"
            >
              <StatefulBody
                activePage={pageInfo.activePage}
                browserFields={browserFields}
                data={isBlankTimeline ? EMPTY_EVENTS : events}
                id={timelineId}
                refetch={refetch}
                renderCellValue={renderCellValue}
                rowRenderers={rowRenderers}
                sort={NO_SORTING}
                tabType={TimelineTabs.eql}
                totalPages={calculateTotalPages({
                  itemsCount: totalCount,
                  itemsPerPage,
                })}
                leadingControlColumns={leadingControlColumns}
                trailingControlColumns={trailingControlColumns}
              />
            </StyledEuiFlyoutBody>

            <StyledEuiFlyoutFooter
              data-test-subj={`${TimelineTabs.eql}-tab-flyout-footer`}
              className="timeline-flyout-footer"
            >
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
            </StyledEuiFlyoutFooter>
          </EventDetailsWidthProvider>
        </ScrollableFlexItem>
        {showExpandedDetails && (
          <>
            <VerticalRule />
            <ScrollableFlexItem grow={1}>
              <DetailsPanel
                browserFields={browserFields}
                runtimeMappings={runtimeMappings}
                tabType={TimelineTabs.eql}
                scopeId={timelineId}
                handleOnPanelClosed={handleOnPanelClosed}
              />
            </ScrollableFlexItem>
          </>
        )}
      </FullWidthFlexGroup>
    </>
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const { activeTab, columns, eqlOptions, expandedDetail, itemsPerPage, itemsPerPageOptions } =
      timeline;

    return {
      activeTab,
      columns,
      eqlOptions,
      end: input.timerange.to,
      expandedDetail,
      timelineId,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      showExpandedDetails:
        !!expandedDetail[TimelineTabs.eql] && !!expandedDetail[TimelineTabs.eql]?.panelView,

      start: input.timerange.from,
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

const EqlTabContent = connector(
  React.memo(
    EqlTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.activeTab === nextProps.activeTab &&
      isTimerangeSame(prevProps, nextProps) &&
      deepEqual(prevProps.eqlOptions, nextProps.eqlOptions) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions)
  )
);

// eslint-disable-next-line import/no-default-export
export { EqlTabContent as default };

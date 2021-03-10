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
import React, { useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Dispatch } from 'redux';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';

import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers/index';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { calculateTotalPages } from '../helpers';
import { TimelineRefetch } from '../refetch_timeline';
import { useManageTimeline } from '../../manage_timeline';
import { TimelineEventsType, TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import { PickEventType } from '../search_or_filter/pick_events';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { useEqlEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { TimelineDatePickerLock } from '../date_picker_lock';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { ToggleDetailPanel } from '../../../store/timeline/actions';
import { DetailsPanel } from '../../side_panel';
import { EqlQueryBarTimeline } from '../query_bar/eql';
import { Sort } from '../body/sort';

const TimelineHeaderContainer = styled.div`
  margin-top: 6px;
  width: 100%;
`;

TimelineHeaderContainer.displayName = 'TimelineHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: stretch;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  padding: 0;

  &.euiFlyoutHeader {
    ${({ theme }) =>
      `padding: 0 ${theme.eui.euiSizeS} ${theme.eui.euiSizeS} ${theme.eui.euiSizeS};`}
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
  overflow: hidden;
`;

const DatePicker = styled(EuiFlexItem)`
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;

DatePicker.displayName = 'DatePicker';

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

VerticalRule.displayName = 'VerticalRule';

const EventsCountBadge = styled(EuiBadge)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const isTimerangeSame = (prevProps: Props, nextProps: Props) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

interface OwnProps {
  timelineId: string;
}

const EMPTY_EVENTS: TimelineItem[] = [];

export type Props = OwnProps & PropsFromRedux;

const NO_SORTING: Sort[] = [];

export const EqlTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  end,
  eqlOptions,
  eventType,
  expandedDetail,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  onEventClosed,
  showExpandedDetails,
  start,
  timerangeKind,
  updateEventTypeAndIndexesName,
}) => {
  const { query: eqlQuery = '', ...restEqlOption } = eqlOptions;
  const { portalNode: eqlEventsCountPortalNode } = useEqlEventsCountPortal();
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
  const {
    browserFields,
    docValueFields,
    loading: loadingSourcerer,
    selectedPatterns,
  } = useSourcererScope(SourcererScopeName.timeline);

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

  const { initializeTimeline, setIsTimelineLoading } = useManageTimeline();
  useEffect(() => {
    initializeTimeline({
      id: timelineId,
    });
  }, [initializeTimeline, timelineId]);

  const [
    isQueryLoading,
    { events, inspect, totalCount, pageInfo, loadPage, updatedAt, refetch },
  ] = useTimelineEvents({
    docValueFields,
    endDate: end,
    eqlOptions: restEqlOption,
    id: timelineId,
    indexNames: selectedPatterns,
    fields: getTimelineQueryFields(),
    language: 'eql',
    limit: itemsPerPage,
    filterQuery: eqlQuery ?? '',
    startDate: start,
    skip: !canQueryTimeline(),
    timerangeKind,
  });

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.eql, timelineId });

    if (
      expandedDetail[TimelineTabs.eql]?.panelView &&
      timelineId === TimelineId.active &&
      showExpandedDetails
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [onEventClosed, timelineId, expandedDetail, showExpandedDetails]);

  useEffect(() => {
    setIsTimelineLoading({ id: timelineId, isLoading: isQueryLoading || loadingSourcerer });
  }, [loadingSourcerer, timelineId, isQueryLoading, setIsTimelineLoading]);

  return (
    <>
      <InPortal node={eqlEventsCountPortalNode}>
        {totalCount >= 0 ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
      </InPortal>
      <TimelineRefetch
        id={`${timelineId}-${TimelineTabs.eql}`}
        inputId="timeline"
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
              alignItems="center"
              gutterSize="s"
              data-test-subj="timeline-date-picker-container"
            >
              {timelineFullScreen && setTimelineFullScreen != null && (
                <ExitFullScreen
                  fullScreen={timelineFullScreen}
                  setFullScreen={setTimelineFullScreen}
                />
              )}
              <DatePicker grow={1}>
                <SuperDatePicker id="timeline" timelineId={timelineId} />
              </DatePicker>
              <EuiFlexItem grow={false}>
                <TimelineDatePickerLock />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <PickEventType
                  eventType={eventType}
                  onChangeEventTypeAndIndexesName={updateEventTypeAndIndexesName}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <TimelineHeaderContainer data-test-subj="timelineHeader">
              <EqlQueryBarTimeline timelineId={timelineId} />
            </TimelineHeaderContainer>
          </StyledEuiFlyoutHeader>

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
                sort={NO_SORTING}
                tabType={TimelineTabs.eql}
                totalPages={calculateTotalPages({
                  itemsCount: totalCount,
                  itemsPerPage,
                })}
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
                  updatedAt={updatedAt}
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
                docValueFields={docValueFields}
                tabType={TimelineTabs.eql}
                timelineId={timelineId}
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
    const {
      activeTab,
      columns,
      eqlOptions,
      eventType,
      expandedDetail,
      itemsPerPage,
      itemsPerPageOptions,
    } = timeline;

    return {
      activeTab,
      columns,
      eqlOptions,
      eventType: eventType ?? 'raw',
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

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  updateEventTypeAndIndexesName: (newEventType: TimelineEventsType, newIndexNames: string[]) => {
    dispatch(timelineActions.updateEventType({ id: timelineId, eventType: newEventType }));
    dispatch(timelineActions.updateIndexNames({ id: timelineId, indexNames: newIndexNames }));
    dispatch(
      sourcererActions.setSelectedIndexPatterns({
        id: SourcererScopeName.timeline,
        selectedPatterns: newIndexNames,
      })
    );
  },
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
      prevProps.eventType === nextProps.eventType &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.timelineId === nextProps.timelineId &&
      prevProps.updateEventTypeAndIndexesName === nextProps.updateEventTypeAndIndexesName &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions)
  )
);

// eslint-disable-next-line import/no-default-export
export { EqlTabContent as default };

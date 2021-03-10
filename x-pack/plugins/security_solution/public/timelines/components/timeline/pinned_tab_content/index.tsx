/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Dispatch } from 'redux';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { Direction } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers/index';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import { sourcererSelectors } from '../../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { TimelineModel } from '../../../store/timeline/model';
import { ToggleDetailPanel } from '../../../store/timeline/actions';
import { State } from '../../../../common/store';
import { calculateTotalPages } from '../helpers';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { DetailsPanel } from '../../side_panel';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';

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

const ExitFullScreenFlexItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    ${({ theme }) => `margin: ${theme.eui.euiSizeS} 0 0 ${theme.eui.euiSizeS};`}
  }

  width: 180px;
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: hidden;
`;

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

VerticalRule.displayName = 'VerticalRule';

interface OwnProps {
  timelineId: string;
}

interface PinnedFilter {
  bool: {
    should: Array<{ match_phrase: { _id: string } }>;
    minimum_should_match: number;
  };
}

export type Props = OwnProps & PropsFromRedux;

export const PinnedTabContentComponent: React.FC<Props> = ({
  columns,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  pinnedEventIds,
  onEventClosed,
  showExpandedDetails,
  sort,
}) => {
  const { browserFields, docValueFields, loading: loadingSourcerer } = useSourcererScope(
    SourcererScopeName.timeline
  );
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();

  const existingIndexNamesSelector = useMemo(
    () => sourcererSelectors.getAllExistingIndexNamesSelector(),
    []
  );
  const existingIndexNames = useDeepEqualSelector<string[]>(existingIndexNamesSelector);

  const filterQuery = useMemo(() => {
    if (isEmpty(pinnedEventIds)) {
      return '';
    }
    const filterObj = Object.entries(pinnedEventIds).reduce<PinnedFilter>(
      (acc, [pinnedId, isPinned]) => {
        if (isPinned) {
          return {
            ...acc,
            bool: {
              ...acc.bool,
              should: [
                ...acc.bool.should,
                {
                  match_phrase: {
                    _id: pinnedId,
                  },
                },
              ],
            },
          };
        }
        return acc;
      },
      {
        bool: {
          should: [],
          minimum_should_match: 1,
        },
      }
    );
    try {
      return JSON.stringify(filterObj);
    } catch {
      return '';
    }
  }, [pinnedEventIds]);

  const timelineQueryFields = useMemo(() => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    const columnFields = columnsHeader.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  }, [columns]);

  const timelineQuerySortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
      })),
    [sort]
  );

  const [
    isQueryLoading,
    { events, totalCount, pageInfo, loadPage, updatedAt, refetch },
  ] = useTimelineEvents({
    docValueFields,
    endDate: '',
    id: `pinned-${timelineId}`,
    indexNames: existingIndexNames,
    fields: timelineQueryFields,
    limit: itemsPerPage,
    filterQuery,
    skip: filterQuery === '',
    startDate: '',
    sort: timelineQuerySortField,
    timerangeKind: undefined,
  });

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.pinned, timelineId });
  }, [timelineId, onEventClosed]);

  return (
    <>
      <FullWidthFlexGroup data-test-subj={`${TimelineTabs.pinned}-tab`} direction="column">
        {timelineFullScreen && setTimelineFullScreen != null && (
          <ExitFullScreenFlexItem grow={false}>
            <ExitFullScreen fullScreen={timelineFullScreen} setFullScreen={setTimelineFullScreen} />
          </ExitFullScreenFlexItem>
        )}

        <ScrollableFlexItem grow={2}>
          <EventDetailsWidthProvider>
            <StyledEuiFlyoutBody
              data-test-subj={`${TimelineTabs.pinned}-tab-flyout-body`}
              className="timeline-flyout-body"
            >
              <StatefulBody
                activePage={pageInfo.activePage}
                browserFields={browserFields}
                data={events}
                id={timelineId}
                refetch={refetch}
                sort={sort}
                tabType={TimelineTabs.pinned}
                totalPages={calculateTotalPages({
                  itemsCount: totalCount,
                  itemsPerPage,
                })}
              />
            </StyledEuiFlyoutBody>
            <StyledEuiFlyoutFooter
              data-test-subj={`${TimelineTabs.pinned}-tab-flyout-footer`}
              className="timeline-flyout-footer"
            >
              <Footer
                activePage={pageInfo.activePage}
                data-test-subj="timeline-footer"
                updatedAt={updatedAt}
                height={footerHeight}
                id={timelineId}
                isLive={false}
                isLoading={isQueryLoading || loadingSourcerer}
                itemsCount={events.length}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={itemsPerPageOptions}
                onChangePage={loadPage}
                totalCount={totalCount}
              />
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
                handleOnPanelClosed={handleOnPanelClosed}
                tabType={TimelineTabs.pinned}
                timelineId={timelineId}
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
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const {
      columns,
      expandedDetail,
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      sort,
    } = timeline;

    return {
      columns,
      timelineId,
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      showExpandedDetails:
        !!expandedDetail[TimelineTabs.pinned] && !!expandedDetail[TimelineTabs.pinned]?.panelView,
      sort,
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

const PinnedTabContent = connector(
  React.memo(
    PinnedTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { PinnedTabContent as default };

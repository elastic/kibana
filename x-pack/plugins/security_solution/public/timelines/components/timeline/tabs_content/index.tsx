/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLoadingContent, EuiTabs, EuiTab } from '@elastic/eui';
import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { TimelineTabs, TimelineId } from '../../../../../common/types/timeline';

import {
  useShallowEqualSelector,
  useDeepEqualSelector,
} from '../../../../common/hooks/use_selector';
import { TimelineEventsCountBadge } from '../../../../common/hooks/use_timeline_events_count';
import { timelineActions } from '../../../store/timeline';
import {
  getActiveTabSelector,
  getNoteIdsSelector,
  getNotesSelector,
  getPinnedEventSelector,
  getShowTimelineSelector,
  getEventIdToNoteIdsSelector,
} from './selectors';
import * as i18n from './translations';

const HideShowContainer = styled.div.attrs<{ $isVisible: boolean }>(({ $isVisible = false }) => ({
  style: {
    display: $isVisible ? 'flex' : 'none',
  },
}))<{ $isVisible: boolean }>`
  flex: 1;
  overflow: hidden;
`;

const QueryTabContent = lazy(() => import('../query_tab_content'));
const GraphTabContent = lazy(() => import('../graph_tab_content'));
const NotesTabContent = lazy(() => import('../notes_tab_content'));
const PinnedTabContent = lazy(() => import('../pinned_tab_content'));

interface BasicTimelineTab {
  timelineId: TimelineId;
  graphEventId?: string;
}

const QueryTab: React.FC<BasicTimelineTab> = memo(({ timelineId }) => (
  <Suspense fallback={<EuiLoadingContent lines={10} />}>
    <QueryTabContent timelineId={timelineId} />
  </Suspense>
));
QueryTab.displayName = 'QueryTab';

const GraphTab: React.FC<BasicTimelineTab> = memo(({ timelineId }) => (
  <Suspense fallback={<EuiLoadingContent lines={10} />}>
    <GraphTabContent timelineId={timelineId} />
  </Suspense>
));
GraphTab.displayName = 'GraphTab';

const NotesTab: React.FC<BasicTimelineTab> = memo(({ timelineId }) => (
  <Suspense fallback={<EuiLoadingContent lines={10} />}>
    <NotesTabContent timelineId={timelineId} />
  </Suspense>
));
NotesTab.displayName = 'NotesTab';

const PinnedTab: React.FC<BasicTimelineTab> = memo(({ timelineId }) => (
  <Suspense fallback={<EuiLoadingContent lines={10} />}>
    <PinnedTabContent timelineId={timelineId} />
  </Suspense>
));
PinnedTab.displayName = 'PinnedTab';

type ActiveTimelineTabProps = BasicTimelineTab & { activeTimelineTab: TimelineTabs };

const ActiveTimelineTab = memo<ActiveTimelineTabProps>(({ activeTimelineTab, timelineId }) => {
  const getTab = useCallback(
    (tab: TimelineTabs) => {
      switch (tab) {
        case TimelineTabs.graph:
          return <GraphTab timelineId={timelineId} />;
        case TimelineTabs.notes:
          return <NotesTab timelineId={timelineId} />;
        default:
          return null;
      }
    },
    [timelineId]
  );

  const isGraphOrNotesTabs = useMemo(
    () => [TimelineTabs.graph, TimelineTabs.notes].includes(activeTimelineTab),
    [activeTimelineTab]
  );

  /* Future developer -> why are we doing that
   * It is really expansive to re-render the QueryTab because the drag/drop
   * Therefore, we are only hiding its dom when switching to another tab
   * to avoid mounting/un-mounting === re-render
   */
  return (
    <>
      <HideShowContainer $isVisible={TimelineTabs.query === activeTimelineTab}>
        <QueryTab timelineId={timelineId} />
      </HideShowContainer>
      <HideShowContainer $isVisible={TimelineTabs.pinned === activeTimelineTab}>
        <PinnedTab timelineId={timelineId} />
      </HideShowContainer>
      <HideShowContainer $isVisible={isGraphOrNotesTabs}>
        {isGraphOrNotesTabs && getTab(activeTimelineTab)}
      </HideShowContainer>
    </>
  );
});

ActiveTimelineTab.displayName = 'ActiveTimelineTab';

const CountBadge = styled(EuiBadge)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const StyledEuiTab = styled(EuiTab)`
  > span {
    display: flex;
    flex-direction: row;
    white-space: pre;
  }

  :focus {
    text-decoration: none;

    > span > span {
      text-decoration: underline;
    }
  }
`;

const TabsContentComponent: React.FC<BasicTimelineTab> = ({ timelineId, graphEventId }) => {
  const dispatch = useDispatch();
  const getActiveTab = useMemo(() => getActiveTabSelector(), []);
  const getShowTimeline = useMemo(() => getShowTimelineSelector(), []);
  const getNumberOfPinnedEvents = useMemo(() => getPinnedEventSelector(), []);
  const getAppNotes = useMemo(() => getNotesSelector(), []);
  const getTimelineNoteIds = useMemo(() => getNoteIdsSelector(), []);
  const getTimelinePinnedEventNotes = useMemo(() => getEventIdToNoteIdsSelector(), []);

  const activeTab = useShallowEqualSelector((state) => getActiveTab(state, timelineId));
  const showTimeline = useShallowEqualSelector((state) => getShowTimeline(state, timelineId));
  const numberOfPinnedEvents = useShallowEqualSelector((state) =>
    getNumberOfPinnedEvents(state, timelineId)
  );
  const globalTimelineNoteIds = useDeepEqualSelector((state) =>
    getTimelineNoteIds(state, timelineId)
  );
  const eventIdToNoteIds = useDeepEqualSelector((state) =>
    getTimelinePinnedEventNotes(state, timelineId)
  );
  const appNotes = useDeepEqualSelector((state) => getAppNotes(state));

  const allTimelineNoteIds = useMemo(() => {
    const eventNoteIds = Object.values(eventIdToNoteIds).reduce<string[]>(
      (acc, v) => [...acc, ...v],
      []
    );
    return [...globalTimelineNoteIds, ...eventNoteIds];
  }, [globalTimelineNoteIds, eventIdToNoteIds]);

  const numberOfNotes = useMemo(
    () => appNotes.filter((appNote) => allTimelineNoteIds.includes(appNote.id)).length,
    [appNotes, allTimelineNoteIds]
  );

  const setQueryAsActiveTab = useCallback(() => {
    dispatch(
      timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.query })
    );
  }, [dispatch, timelineId]);

  const setGraphAsActiveTab = useCallback(() => {
    dispatch(
      timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph })
    );
  }, [dispatch, timelineId]);

  const setNotesAsActiveTab = useCallback(() => {
    dispatch(
      timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.notes })
    );
  }, [dispatch, timelineId]);

  const setPinnedAsActiveTab = useCallback(() => {
    dispatch(
      timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.pinned })
    );
  }, [dispatch, timelineId]);

  useEffect(() => {
    if (!graphEventId && activeTab === TimelineTabs.graph) {
      setQueryAsActiveTab();
    }
  }, [activeTab, graphEventId, setQueryAsActiveTab]);

  return (
    <>
      <EuiTabs>
        <StyledEuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.query}`}
          onClick={setQueryAsActiveTab}
          isSelected={activeTab === TimelineTabs.query}
          disabled={false}
          key={TimelineTabs.query}
        >
          <span>{i18n.QUERY_TAB}</span>
          {showTimeline && <TimelineEventsCountBadge />}
        </StyledEuiTab>
        <EuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.graph}`}
          onClick={setGraphAsActiveTab}
          isSelected={activeTab === TimelineTabs.graph}
          disabled={!graphEventId}
          key={TimelineTabs.graph}
        >
          {i18n.ANALYZER_TAB}
        </EuiTab>
        <StyledEuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.notes}`}
          onClick={setNotesAsActiveTab}
          isSelected={activeTab === TimelineTabs.notes}
          disabled={false}
          key={TimelineTabs.notes}
        >
          <span>{i18n.NOTES_TAB}</span>
          {showTimeline && numberOfNotes > 0 && (
            <div>
              <CountBadge>{numberOfNotes}</CountBadge>
            </div>
          )}
        </StyledEuiTab>
        <StyledEuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.pinned}`}
          onClick={setPinnedAsActiveTab}
          isSelected={activeTab === TimelineTabs.pinned}
          key={TimelineTabs.pinned}
        >
          <span>{i18n.PINNED_TAB}</span>
          {showTimeline && numberOfPinnedEvents > 0 && (
            <div>
              <CountBadge>{numberOfPinnedEvents}</CountBadge>
            </div>
          )}
        </StyledEuiTab>
      </EuiTabs>
      <ActiveTimelineTab activeTimelineTab={activeTab} timelineId={timelineId} />
    </>
  );
};

export const TabsContent = memo(TabsContentComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingContent, EuiTabs, EuiTab } from '@elastic/eui';
import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions } from '../../../store/timeline';
import { TimelineTabs } from '../../../store/timeline/model';
import { getActiveTabSelector } from './selectors';
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

interface BasicTimelineTab {
  timelineId: string;
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
    <QueryTabContent timelineId={timelineId} />
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
        case TimelineTabs.pinned:
          return <PinnedTab timelineId={timelineId} />;
        default:
          return null;
      }
    },
    [timelineId]
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
      <HideShowContainer $isVisible={TimelineTabs.query !== activeTimelineTab}>
        {activeTimelineTab !== TimelineTabs.query && getTab(activeTimelineTab)}
      </HideShowContainer>
    </>
  );
});

ActiveTimelineTab.displayName = 'ActiveTimelineTab';

const TabsContentComponent: React.FC<BasicTimelineTab> = ({ timelineId, graphEventId }) => {
  const dispatch = useDispatch();
  const getActiveTab = useMemo(() => getActiveTabSelector(), []);
  const activeTab = useShallowEqualSelector((state) => getActiveTab(state, timelineId));

  const setQueryAsActiveTab = useCallback(
    () =>
      dispatch(
        timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.query })
      ),
    [dispatch, timelineId]
  );

  const setGraphAsActiveTab = useCallback(
    () =>
      dispatch(
        timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph })
      ),
    [dispatch, timelineId]
  );

  const setNotesAsActiveTab = useCallback(
    () =>
      dispatch(
        timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.notes })
      ),
    [dispatch, timelineId]
  );

  const setPinnedAsActiveTab = useCallback(
    () =>
      dispatch(
        timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.pinned })
      ),
    [dispatch, timelineId]
  );

  useEffect(() => {
    if (!graphEventId && activeTab === TimelineTabs.graph) {
      setQueryAsActiveTab();
    }
  }, [activeTab, graphEventId, setQueryAsActiveTab]);

  return (
    <>
      <EuiTabs>
        <EuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.query}`}
          onClick={setQueryAsActiveTab}
          isSelected={activeTab === TimelineTabs.query}
          disabled={false}
          key={TimelineTabs.query}
        >
          {i18n.QUERY_TAB}
        </EuiTab>
        <EuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.graph}`}
          onClick={setGraphAsActiveTab}
          isSelected={activeTab === TimelineTabs.graph}
          disabled={!graphEventId}
          key={TimelineTabs.graph}
        >
          {i18n.GRAPH_TAB}
        </EuiTab>
        <EuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.notes}`}
          onClick={setNotesAsActiveTab}
          isSelected={activeTab === TimelineTabs.notes}
          disabled={false}
          key={TimelineTabs.notes}
        >
          {i18n.NOTES_TAB}
        </EuiTab>
        <EuiTab
          data-test-subj={`timelineTabs-${TimelineTabs.pinned}`}
          onClick={setPinnedAsActiveTab}
          isSelected={activeTab === TimelineTabs.pinned}
          disabled={true}
          key={TimelineTabs.pinned}
        >
          {i18n.PINNED_TAB}
        </EuiTab>
      </EuiTabs>
      <ActiveTimelineTab activeTimelineTab={activeTab} timelineId={timelineId} />
    </>
  );
};

export const TabsContent = memo(TabsContentComponent);

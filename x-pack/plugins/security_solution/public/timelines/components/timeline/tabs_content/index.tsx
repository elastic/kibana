/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiSkeletonText, EuiTabs, EuiTab } from '@elastic/eui';
import { css } from '@emotion/react';
import { Assistant } from '@kbn/elastic-assistant';
import { isEmpty } from 'lodash/fp';
import type { Ref, ReactElement, ComponentType } from 'react';
import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useConversationStore } from '../../../../assistant/use_conversation_store';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { SessionViewConfig } from '../../../../../common/types';
import type { RowRenderer, TimelineId } from '../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { TimelineType } from '../../../../../common/api/timeline';
import {
  useShallowEqualSelector,
  useDeepEqualSelector,
} from '../../../../common/hooks/use_selector';
import {
  EqlEventsCountBadge,
  TimelineEventsCountBadge,
} from '../../../../common/hooks/use_timeline_events_count';
import { timelineActions } from '../../../store/timeline';
import type { CellValueElementProps } from '../cell_rendering';
import {
  getActiveTabSelector,
  getNoteIdsSelector,
  getNotesSelector,
  getPinnedEventSelector,
  getShowTimelineSelector,
  getEventIdToNoteIdsSelector,
} from './selectors';
import * as i18n from './translations';
import { useLicense } from '../../../../common/hooks/use_license';
import { TIMELINE_CONVERSATION_TITLE } from '../../../../assistant/content/conversations/translations';

const HideShowContainer = styled.div.attrs<{ $isVisible: boolean; isOverflowYScroll: boolean }>(
  ({ $isVisible = false, isOverflowYScroll = false }) => ({
    style: {
      display: $isVisible ? 'flex' : 'none',
      overflow: isOverflowYScroll ? 'hidden scroll' : 'hidden',
    },
  })
)<{ $isVisible: boolean; isOverflowYScroll?: boolean }>`
  flex: 1;
`;

/**
 * A HOC which supplies React.Suspense with a fallback component
 * @param Component A component deferred by `React.lazy`
 * @param fallback A fallback component to render while things load. Default is EuiSekeleton for all tabs
 */
const tabWithSuspense = <P extends {}, R = {}>(
  Component: ComponentType<P>,
  fallback: ReactElement | null = <EuiSkeletonText lines={10} />
) => {
  const Comp = React.forwardRef((props: P, ref: Ref<R>) => (
    <Suspense fallback={fallback}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));

  Comp.displayName = `${Component.displayName ?? 'Tab'}WithSuspense`;
  return Comp;
};

const AssistantTabContainer = styled.div`
  overflow-y: auto;
  width: 100%;
`;

const QueryTab = tabWithSuspense(lazy(() => import('../query_tab_content')));
const EqlTab = tabWithSuspense(lazy(() => import('../eql_tab_content')));
const GraphTab = tabWithSuspense(lazy(() => import('../graph_tab_content')));
const NotesTab = tabWithSuspense(lazy(() => import('../notes_tab_content')));
const PinnedTab = tabWithSuspense(lazy(() => import('../pinned_tab_content')));
const SessionTab = tabWithSuspense(lazy(() => import('../session_tab_content')));
const DiscoverTab = tabWithSuspense(lazy(() => import('../discover_tab_content')));

interface BasicTimelineTab {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineFullScreen?: boolean;
  timelineId: TimelineId;
  timelineType: TimelineType;
  graphEventId?: string;
  sessionViewConfig?: SessionViewConfig | null;
  timelineDescription: string;
}

const AssistantTab: React.FC<{
  isAssistantEnabled: boolean;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: TimelineId;
  shouldRefocusPrompt: boolean;
}> = memo(
  ({ isAssistantEnabled, renderCellValue, rowRenderers, timelineId, shouldRefocusPrompt }) => (
    <Suspense fallback={<EuiSkeletonText lines={10} />}>
      <AssistantTabContainer>
        <Assistant
          isAssistantEnabled={isAssistantEnabled}
          conversationId={TIMELINE_CONVERSATION_TITLE}
          shouldRefocusPrompt={shouldRefocusPrompt}
        />
      </AssistantTabContainer>
    </Suspense>
  )
);

AssistantTab.displayName = 'AssistantTab';

type ActiveTimelineTabProps = BasicTimelineTab & {
  activeTimelineTab: TimelineTabs;
  showTimeline: boolean;
};

const ActiveTimelineTab = memo<ActiveTimelineTabProps>(
  ({
    activeTimelineTab,
    renderCellValue,
    rowRenderers,
    timelineId,
    timelineType,
    showTimeline,
  }) => {
    const isDiscoverInTimelineEnabled = useIsExperimentalFeatureEnabled('discoverInTimeline');
    const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
    const getTab = useCallback(
      (tab: TimelineTabs) => {
        switch (tab) {
          case TimelineTabs.graph:
            return <GraphTab timelineId={timelineId} />;
          case TimelineTabs.notes:
            return <NotesTab timelineId={timelineId} />;
          case TimelineTabs.session:
            return <SessionTab timelineId={timelineId} />;
          default:
            return null;
        }
      },
      [timelineId]
    );

    const isGraphOrNotesTabs = useMemo(
      () =>
        [TimelineTabs.graph, TimelineTabs.notes, TimelineTabs.session].includes(activeTimelineTab),
      [activeTimelineTab]
    );

    const { conversations } = useConversationStore();

    const hasTimelineConversationStarted = useMemo(
      () => conversations[TIMELINE_CONVERSATION_TITLE].messages.length > 0,
      [conversations]
    );

    /* Future developer -> why are we doing that
     * It is really expansive to re-render the QueryTab because the drag/drop
     * Therefore, we are only hiding its dom when switching to another tab
     * to avoid mounting/un-mounting === re-render
     */
    return (
      <>
        <HideShowContainer
          $isVisible={TimelineTabs.query === activeTimelineTab}
          data-test-subj={`timeline-tab-content-${TimelineTabs.query}`}
        >
          <QueryTab
            renderCellValue={renderCellValue}
            rowRenderers={rowRenderers}
            timelineId={timelineId}
          />
        </HideShowContainer>
        <HideShowContainer
          $isVisible={TimelineTabs.pinned === activeTimelineTab}
          data-test-subj={`timeline-tab-content-${TimelineTabs.pinned}`}
        >
          <PinnedTab
            renderCellValue={renderCellValue}
            rowRenderers={rowRenderers}
            timelineId={timelineId}
          />
        </HideShowContainer>
        {timelineType === TimelineType.default && (
          <HideShowContainer
            $isVisible={TimelineTabs.eql === activeTimelineTab}
            data-test-subj={`timeline-tab-content-${TimelineTabs.eql}`}
          >
            <EqlTab
              renderCellValue={renderCellValue}
              rowRenderers={rowRenderers}
              timelineId={timelineId}
            />
          </HideShowContainer>
        )}
        <HideShowContainer
          $isVisible={isGraphOrNotesTabs}
          isOverflowYScroll={activeTimelineTab === TimelineTabs.session}
          data-test-subj={`timeline-tab-content-${TimelineTabs.graph}-${TimelineTabs.notes}`}
        >
          {isGraphOrNotesTabs && getTab(activeTimelineTab)}
        </HideShowContainer>
        {hasAssistantPrivilege && (
          <HideShowContainer
            $isVisible={activeTimelineTab === TimelineTabs.securityAssistant}
            isOverflowYScroll={activeTimelineTab === TimelineTabs.securityAssistant}
            data-test-subj={`timeline-tab-content-security-assistant`}
            css={css`
              overflow: hidden !important;
            `}
          >
            {(activeTimelineTab === TimelineTabs.securityAssistant ||
              hasTimelineConversationStarted) && (
              <AssistantTab
                isAssistantEnabled={isAssistantEnabled}
                renderCellValue={renderCellValue}
                rowRenderers={rowRenderers}
                timelineId={timelineId}
                shouldRefocusPrompt={
                  showTimeline && activeTimelineTab === TimelineTabs.securityAssistant
                }
              />
            )}
          </HideShowContainer>
        )}
        {isDiscoverInTimelineEnabled && (
          <HideShowContainer
            $isVisible={TimelineTabs.discover === activeTimelineTab}
            data-test-subj={`timeline-tab-content-${TimelineTabs.discover}`}
          >
            <DiscoverTab />
          </HideShowContainer>
        )}
      </>
    );
  }
);

ActiveTimelineTab.displayName = 'ActiveTimelineTab';

const CountBadge = styled(EuiBadge)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const StyledEuiTab = styled(EuiTab)`
  .euiTab__content {
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

const TabsContentComponent: React.FC<BasicTimelineTab> = ({
  renderCellValue,
  rowRenderers,
  timelineId,
  timelineFullScreen,
  timelineType,
  graphEventId,
  sessionViewConfig,
  timelineDescription,
}) => {
  const isDiscoverInTimelineEnabled = useIsExperimentalFeatureEnabled('discoverInTimeline');
  const { hasAssistantPrivilege } = useAssistantAvailability();
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

  const isEnterprisePlus = useLicense().isEnterprise();

  const allTimelineNoteIds = useMemo(() => {
    const eventNoteIds = Object.values(eventIdToNoteIds).reduce<string[]>(
      (acc, v) => [...acc, ...v],
      []
    );
    return [...globalTimelineNoteIds, ...eventNoteIds];
  }, [globalTimelineNoteIds, eventIdToNoteIds]);

  const numberOfNotes = useMemo(
    () =>
      appNotes.filter((appNote) => allTimelineNoteIds.includes(appNote.id)).length +
      (isEmpty(timelineDescription) ? 0 : 1),
    [appNotes, allTimelineNoteIds, timelineDescription]
  );

  const setActiveTab = useCallback(
    (tab: TimelineTabs) => {
      dispatch(timelineActions.setActiveTabTimeline({ id: timelineId, activeTab: tab }));
    },
    [dispatch, timelineId]
  );

  const setQueryAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.query);
  }, [setActiveTab]);

  const setEqlAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.eql);
  }, [setActiveTab]);

  const setGraphAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.graph);
  }, [setActiveTab]);

  const setNotesAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.notes);
  }, [setActiveTab]);

  const setPinnedAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.pinned);
  }, [setActiveTab]);

  const setSessionAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.session);
  }, [setActiveTab]);

  const setSecurityAssistantAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.securityAssistant);
  }, [setActiveTab]);

  const setDiscoverAsActiveTab = useCallback(() => {
    setActiveTab(TimelineTabs.discover);
  }, [setActiveTab]);

  useEffect(() => {
    if (!graphEventId && activeTab === TimelineTabs.graph) {
      setQueryAsActiveTab();
    }
  }, [activeTab, graphEventId, setQueryAsActiveTab]);

  return (
    <>
      {!timelineFullScreen && (
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
          {timelineType === TimelineType.default && (
            <StyledEuiTab
              data-test-subj={`timelineTabs-${TimelineTabs.eql}`}
              onClick={setEqlAsActiveTab}
              isSelected={activeTab === TimelineTabs.eql}
              disabled={false}
              key={TimelineTabs.eql}
            >
              <span>{i18n.EQL_TAB}</span>
              {showTimeline && <EqlEventsCountBadge />}
            </StyledEuiTab>
          )}
          <EuiTab
            data-test-subj={`timelineTabs-${TimelineTabs.graph}`}
            onClick={setGraphAsActiveTab}
            isSelected={activeTab === TimelineTabs.graph}
            disabled={!graphEventId}
            key={TimelineTabs.graph}
          >
            {i18n.ANALYZER_TAB}
          </EuiTab>
          {isEnterprisePlus && (
            <EuiTab
              data-test-subj={`timelineTabs-${TimelineTabs.session}`}
              onClick={setSessionAsActiveTab}
              isSelected={activeTab === TimelineTabs.session}
              disabled={sessionViewConfig === null}
              key={TimelineTabs.session}
            >
              {i18n.SESSION_TAB}
            </EuiTab>
          )}
          <StyledEuiTab
            data-test-subj={`timelineTabs-${TimelineTabs.notes}`}
            onClick={setNotesAsActiveTab}
            isSelected={activeTab === TimelineTabs.notes}
            disabled={timelineType === TimelineType.template}
            key={TimelineTabs.notes}
          >
            <span>{i18n.NOTES_TAB}</span>
            {showTimeline && numberOfNotes > 0 && timelineType === TimelineType.default && (
              <div>
                <CountBadge>{numberOfNotes}</CountBadge>
              </div>
            )}
          </StyledEuiTab>
          <StyledEuiTab
            data-test-subj={`timelineTabs-${TimelineTabs.pinned}`}
            onClick={setPinnedAsActiveTab}
            disabled={timelineType === TimelineType.template}
            isSelected={activeTab === TimelineTabs.pinned}
            key={TimelineTabs.pinned}
          >
            <span>{i18n.PINNED_TAB}</span>
            {showTimeline && numberOfPinnedEvents > 0 && timelineType === TimelineType.default && (
              <div>
                <CountBadge>{numberOfPinnedEvents}</CountBadge>
              </div>
            )}
          </StyledEuiTab>
          {hasAssistantPrivilege && (
            <StyledEuiTab
              data-test-subj={`timelineTabs-${TimelineTabs.securityAssistant}`}
              onClick={setSecurityAssistantAsActiveTab}
              disabled={timelineType === TimelineType.template}
              isSelected={activeTab === TimelineTabs.securityAssistant}
              key={TimelineTabs.securityAssistant}
            >
              <span>{i18n.SECURITY_ASSISTANT}</span>
            </StyledEuiTab>
          )}
          {isDiscoverInTimelineEnabled && (
            <StyledEuiTab
              data-test-subj={`timelineTabs-${TimelineTabs.discover}`}
              onClick={setDiscoverAsActiveTab}
              isSelected={activeTab === TimelineTabs.discover}
              disabled={false}
              key={TimelineTabs.discover}
            >
              <span>{i18n.DISCOVER_IN_TIMELINE_TAB}</span>
            </StyledEuiTab>
          )}
        </EuiTabs>
      )}

      <ActiveTimelineTab
        activeTimelineTab={activeTab}
        renderCellValue={renderCellValue}
        rowRenderers={rowRenderers}
        timelineId={timelineId}
        timelineType={timelineType}
        timelineDescription={timelineDescription}
        showTimeline={showTimeline}
      />
    </>
  );
};

export const TabsContent = memo(TabsContentComponent);

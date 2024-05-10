/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiSkeletonText, EuiTabs, EuiTab } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import type { Ref, ReactElement, ComponentType } from 'react';
import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useEsqlAvailability } from '../../../../common/hooks/esql/use_esql_availability';
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
import { timelineActions } from '../../../store';
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
import { initializeTimelineSettings } from '../../../store/actions';
import { selectTimelineESQLSavedSearchId } from '../../../store/selectors';

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

const QueryTab = tabWithSuspense(lazy(() => import('./query')));
const EqlTab = tabWithSuspense(lazy(() => import('./eql')));
const GraphTab = tabWithSuspense(lazy(() => import('./graph')));
const NotesTab = tabWithSuspense(lazy(() => import('./notes')));
const PinnedTab = tabWithSuspense(lazy(() => import('./pinned')));
const SessionTab = tabWithSuspense(lazy(() => import('./session')));
const EsqlTab = tabWithSuspense(lazy(() => import('./esql')));
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
    const { isTimelineEsqlEnabledByFeatureFlag, isEsqlAdvancedSettingEnabled } =
      useEsqlAvailability();
    const timelineESQLSavedSearch = useShallowEqualSelector((state) =>
      selectTimelineESQLSavedSearchId(state, timelineId)
    );
    const shouldShowESQLTab = useMemo(() => {
      // disabling esql feature from feature flag should unequivocally hide the tab
      // irrespective of the fact that the advanced setting is enabled or
      // not or existing esql query is present or not
      if (!isTimelineEsqlEnabledByFeatureFlag) {
        return false;
      }
      return isEsqlAdvancedSettingEnabled || timelineESQLSavedSearch != null;
    }, [isEsqlAdvancedSettingEnabled, isTimelineEsqlEnabledByFeatureFlag, timelineESQLSavedSearch]);
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
        {showTimeline && shouldShowESQLTab && activeTimelineTab === TimelineTabs.esql && (
          <HideShowContainer
            $isVisible={true}
            data-test-subj={`timeline-tab-content-${TimelineTabs.esql}`}
          >
            <EsqlTab timelineId={timelineId} />
          </HideShowContainer>
        )}
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
    align-items: center;
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

const StyledEuiTabs = styled(EuiTabs)`
  padding-inline: ${(props) => props.theme.eui.euiSizeM};
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
  const dispatch = useDispatch();
  const getActiveTab = useMemo(() => getActiveTabSelector(), []);
  const getShowTimeline = useMemo(() => getShowTimelineSelector(), []);
  const getNumberOfPinnedEvents = useMemo(() => getPinnedEventSelector(), []);
  const getAppNotes = useMemo(() => getNotesSelector(), []);
  const getTimelineNoteIds = useMemo(() => getNoteIdsSelector(), []);
  const getTimelinePinnedEventNotes = useMemo(() => getEventIdToNoteIdsSelector(), []);
  const { isEsqlAdvancedSettingEnabled, isTimelineEsqlEnabledByFeatureFlag } =
    useEsqlAvailability();

  const timelineESQLSavedSearch = useShallowEqualSelector((state) =>
    selectTimelineESQLSavedSearchId(state, timelineId)
  );

  const activeTab = useShallowEqualSelector((state) => getActiveTab(state, timelineId));
  const showTimeline = useShallowEqualSelector((state) => getShowTimeline(state, timelineId));
  const shouldShowESQLTab = useMemo(() => {
    // disabling esql feature from feature flag should unequivocally hide the tab
    // irrespective of the fact that the advanced setting is enabled or
    // not or existing esql query is present or not
    if (!isTimelineEsqlEnabledByFeatureFlag) {
      return false;
    }
    return isEsqlAdvancedSettingEnabled || timelineESQLSavedSearch != null;
  }, [isEsqlAdvancedSettingEnabled, isTimelineEsqlEnabledByFeatureFlag, timelineESQLSavedSearch]);

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

  const setEsqlAsActiveTab = useCallback(() => {
    dispatch(
      initializeTimelineSettings({
        id: timelineId,
      })
    );
    setActiveTab(TimelineTabs.esql);
  }, [setActiveTab, dispatch, timelineId]);

  useEffect(() => {
    if (!graphEventId && activeTab === TimelineTabs.graph) {
      setQueryAsActiveTab();
    }
  }, [activeTab, graphEventId, setQueryAsActiveTab]);

  return (
    <>
      {!timelineFullScreen && (
        <StyledEuiTabs className="eui-scrollBar">
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
          {shouldShowESQLTab && (
            <StyledEuiTab
              data-test-subj={`timelineTabs-${TimelineTabs.esql}`}
              onClick={setEsqlAsActiveTab}
              isSelected={activeTab === TimelineTabs.esql}
              disabled={false}
              key={TimelineTabs.esql}
            >
              <span>{i18n.DISCOVER_ESQL_IN_TIMELINE_TAB}</span>
            </StyledEuiTab>
          )}
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
        </StyledEuiTabs>
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { EuiProgress } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, createContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { isTab } from '@kbn/timelines-plugin/public';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { timelineActions, timelineSelectors } from '../../store';
import { timelineDefaults } from '../../store/defaults';
import { defaultHeaders } from './body/column_headers/default_headers';
import type { CellValueElementProps } from './cell_rendering';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { TimelineModalHeader } from '../modal/header';
import type { TimelineId, RowRenderer, TimelineTabs } from '../../../../common/types/timeline';
import { TimelineType } from '../../../../common/api/timeline';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import type { State } from '../../../common/store';
import { EVENTS_COUNT_BUTTON_CLASS_NAME, onTimelineTabKeyPressed } from './helpers';
import * as i18n from './translations';
import { TabsContent } from './tabs';
import { HideShowContainer, TimelineContainer } from './styles';
import { useTimelineFullScreen } from '../../../common/containers/use_full_screen';
import { EXIT_FULL_SCREEN_CLASS_NAME } from '../../../common/components/exit_full_screen';
import { useResolveConflict } from '../../../common/hooks/use_resolve_conflict';
import { sourcererSelectors } from '../../../common/store';
import { TimelineTour } from './tour';
import { defaultUdtHeaders } from './unified_components/default_headers';

const TimelineTemplateBadge = styled.div`
  background: ${({ theme }) => theme.eui.euiColorVis3_behindText};
  color: #fff;
  padding: 10px 15px;
  font-size: 0.8em;
`;

const TimelineBody = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const TimelineContext = createContext<{ timelineId: string | null }>({ timelineId: null });
export interface Props {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: TimelineId;
  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>;
}

const TimelineSavingProgressComponent: React.FC<{ timelineId: TimelineId }> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const isSaving = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).isSaving
  );

  return isSaving ? <EuiProgress size="s" color="primary" position="absolute" /> : null;
};

const TimelineSavingProgress = React.memo(TimelineSavingProgressComponent);

const StatefulTimelineComponent: React.FC<Props> = ({
  renderCellValue,
  rowRenderers,
  timelineId,
  openToggleRef,
}) => {
  const dispatch = useDispatch();

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const selectedPatternsSourcerer = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedPatterns(state, SourcererScopeName.timeline);
  });
  const selectedDataViewIdSourcerer = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedDataViewId(state, SourcererScopeName.timeline);
  });
  const {
    dataViewId: selectedDataViewIdTimeline,
    indexNames: selectedPatternsTimeline,
    graphEventId,
    savedObjectId,
    timelineType,
    description,
    sessionViewConfig,
    initialized,
    show: isOpen,
    isLoading,
    activeTab,
  } = useDeepEqualSelector((state) =>
    pick(
      [
        'indexNames',
        'dataViewId',
        'graphEventId',
        'savedObjectId',
        'timelineType',
        'description',
        'sessionViewConfig',
        'initialized',
        'show',
        'isLoading',
        'activeTab',
      ],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );

  const {
    kibanaSecuritySolutionsPrivileges: { crud: canEditTimeline },
  } = useUserPrivileges();

  const { timelineFullScreen } = useTimelineFullScreen();

  useEffect(() => {
    if (!savedObjectId && !initialized) {
      dispatch(
        timelineActions.createTimeline({
          id: timelineId,
          columns: unifiedComponentsInTimelineEnabled ? defaultUdtHeaders : defaultHeaders,
          dataViewId: selectedDataViewIdSourcerer,
          indexNames: selectedPatternsSourcerer,
          show: false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSourcererChange = useCallback(() => {
    if (
      // timeline not initialized, so this must be initial state and not user change
      !savedObjectId ||
      selectedDataViewIdSourcerer == null ||
      // initial state will get set on create
      (selectedDataViewIdTimeline === null && selectedPatternsTimeline.length === 0) ||
      // don't update if no change
      (selectedDataViewIdTimeline === selectedDataViewIdSourcerer &&
        selectedPatternsTimeline.sort().join() === selectedPatternsSourcerer.sort().join())
    ) {
      return;
    }
    dispatch(
      timelineActions.updateDataView({
        dataViewId: selectedDataViewIdSourcerer,
        id: timelineId,
        indexNames: selectedPatternsSourcerer,
      })
    );
  }, [
    dispatch,
    savedObjectId,
    selectedDataViewIdSourcerer,
    selectedDataViewIdTimeline,
    selectedPatternsSourcerer,
    selectedPatternsTimeline,
    timelineId,
  ]);

  useEffect(() => {
    onSourcererChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewIdSourcerer, selectedPatternsSourcerer]);

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    const exitFullScreenButton = containerElement.current?.querySelector<HTMLButtonElement>(
      EXIT_FULL_SCREEN_CLASS_NAME
    );

    if (exitFullScreenButton != null) {
      exitFullScreenButton.focus();
    } else {
      containerElement.current
        ?.querySelector<HTMLButtonElement>('.globalFilterBar__addButton')
        ?.focus();
    }
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    containerElement.current
      ?.querySelector<HTMLButtonElement>(`.${EVENTS_COUNT_BUTTON_CLASS_NAME}`)
      ?.focus();
  }, [containerElement]);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );
  const timelineContext = useMemo(() => ({ timelineId }), [timelineId]);
  const resolveConflictComponent = useResolveConflict();

  const showTimelineTour = isOpen && !isLoading && canEditTimeline;

  const handleSwitchToTab = useCallback(
    (tab: TimelineTabs) => {
      dispatch(
        timelineActions.setActiveTabTimeline({
          id: timelineId,
          activeTab: tab,
        })
      );
    },
    [timelineId, dispatch]
  );

  return (
    <TimelineContext.Provider value={timelineContext}>
      <TimelineContainer
        data-test-subj="timeline"
        data-timeline-id={timelineId}
        onKeyDown={onKeyDown}
        ref={containerElement}
      >
        <TimelineSavingProgress timelineId={timelineId} />
        <TimelineBody data-test-subj="timeline-body">
          {timelineType === TimelineType.template && (
            <TimelineTemplateBadge className="timeline-template-badge">
              {i18n.TIMELINE_TEMPLATE}
            </TimelineTemplateBadge>
          )}
          {resolveConflictComponent}
          <HideShowContainer
            $isVisible={!timelineFullScreen}
            data-test-subj="timeline-hide-show-container"
          >
            <TimelineModalHeader timelineId={timelineId} openToggleRef={openToggleRef} />
          </HideShowContainer>

          <TabsContent
            graphEventId={graphEventId}
            sessionViewConfig={sessionViewConfig}
            renderCellValue={renderCellValue}
            rowRenderers={rowRenderers}
            timelineId={timelineId}
            timelineType={timelineType}
            timelineDescription={description}
            timelineFullScreen={timelineFullScreen}
          />
        </TimelineBody>
      </TimelineContainer>
      {showTimelineTour ? (
        <TimelineTour
          activeTab={activeTab}
          switchToTab={handleSwitchToTab}
          timelineType={timelineType}
        />
      ) : null}
    </TimelineContext.Provider>
  );
};

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

export const StatefulTimeline = React.memo(StatefulTimelineComponent);
